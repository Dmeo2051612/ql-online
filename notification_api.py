import base64
import binascii
import json
import queue
import re
import time
import unicodedata
from collections import Counter
from datetime import datetime, timedelta, timezone

from flask import Blueprint, Response, jsonify, request, stream_with_context
from firebase_admin import firestore

from firebase_admin_config import get_firebase_auth
from password_security import hash_password


notification_api_bp = Blueprint("notification_api", __name__)
_identity_cache = {}
PASSWORD_EXPIRY_GRACE_SECONDS = 30 * 60


def _current_identity():
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        return None
    try:
        decoded = get_firebase_auth().verify_id_token(token)
    except Exception:
        time.sleep(0.2)
        decoded = get_firebase_auth().verify_id_token(token)
    uid = decoded.get("uid")
    cached = _identity_cache.get(uid)
    if cached and cached["expiresAt"] > time.time():
        profile = cached["profile"]
    else:
        try:
            profile_snapshot = firestore.client().collection("users").document(uid).get()
        except Exception:
            time.sleep(0.2)
            profile_snapshot = firestore.client().collection("users").document(uid).get()
        if not profile_snapshot.exists:
            return None
        profile = profile_snapshot.to_dict() or {}
        _identity_cache[uid] = {"profile": profile, "expiresAt": time.time() + 60}
    return {
        "uid": uid,
        "email": decoded.get("email", ""),
        "role": str(profile.get("role", "")).strip().lower(),
        "masv": str(profile.get("masv", "")).strip(),
        "magv": str(profile.get("magv", "")).strip(),
        "hoten": str(profile.get("hoten", "")).strip(),
    }


def _admin_identity():
    identity = _current_identity()
    return identity if identity and identity["role"] == "admin" else None


@notification_api_bp.post("/api/admin/students")
def create_or_link_student():
    """Create a student or complete an orphaned Firebase Auth account."""
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được thêm sinh viên."), 403

    payload = request.get_json(silent=True) or {}
    student_id = str(payload.get("masv") or "").strip()
    full_name = str(payload.get("hoten") or "").strip()
    email = str(payload.get("mail") or "").strip().lower()
    password = str(payload.get("matkhau") or "")
    birthday = str(payload.get("ngaysinh") or "").strip()
    department_id = str(payload.get("makhoa") or "").strip()
    enrollment_year = str(payload.get("namnhaphoc") or "").strip()

    if not all((student_id, full_name, email, password, birthday, department_id, enrollment_year)):
        return jsonify(error="Vui lòng nhập đầy đủ thông tin sinh viên."), 400
    if "@" not in email or len(email) > 254:
        return jsonify(error="Email không hợp lệ."), 400
    try:
        enrollment_year_number = int(enrollment_year)
    except ValueError:
        return jsonify(error="Năm nhập học không hợp lệ."), 400

    database = firestore.client()
    student_ref = database.collection("sinhvien").document(student_id)
    if student_ref.get().exists:
        return jsonify(error="Mã sinh viên đã tồn tại."), 409

    # Do not let one email point to two student records.
    for snapshot in database.collection("sinhvien").stream():
        current = snapshot.to_dict() or {}
        if str(current.get("mail") or "").strip().lower() == email:
            return jsonify(error="Email đã được gắn với một sinh viên khác."), 409

    auth_api = get_firebase_auth()
    created_auth_user = False
    user = None
    try:
        try:
            user = auth_api.get_user_by_email(email)
            linked_existing_account = True
        except auth_api.UserNotFoundError:
            user = auth_api.create_user(email=email, password=password)
            created_auth_user = True
            linked_existing_account = False

        user_ref = database.collection("users").document(user.uid)
        existing_profile = user_ref.get()
        if existing_profile.exists:
            profile = existing_profile.to_dict() or {}
            existing_role = str(profile.get("role") or "").strip().lower()
            existing_student_id = str(profile.get("masv") or "").strip()
            if existing_role not in {"", "sinhvien"}:
                return jsonify(error="Email này đã thuộc một loại tài khoản khác."), 409
            if existing_student_id and existing_student_id != student_id:
                return jsonify(error="Email này đã được phân quyền cho sinh viên khác."), 409

        batch = database.batch()
        user_profile = {
            "email": email,
            "role": "sinhvien",
            "masv": student_id,
            "hoten": full_name,
        }
        if not linked_existing_account:
            user_profile.update({
                "passwordChangedAt": datetime.now(timezone.utc),
                "passwordHistory": [hash_password(password)],
            })
        elif not isinstance((existing_profile.to_dict() or {}).get("passwordChangedAt"), datetime):
            user_profile["passwordChangedAt"] = datetime.now(timezone.utc)
        batch.set(user_ref, user_profile, merge=True)
        batch.set(student_ref, {
            "uid": user.uid,
            "mail": email,
            "hoten": full_name,
            "ngaysinh": birthday,
            "makhoa": department_id,
            "namnhaphoc": enrollment_year_number,
        })
        batch.commit()
        _identity_cache.pop(user.uid, None)
    except Exception as exc:
        if created_auth_user and user is not None:
            try:
                auth_api.delete_user(user.uid)
            except Exception:
                pass
        if isinstance(exc, getattr(auth_api, "EmailAlreadyExistsError", ())):
            return jsonify(error="Email vừa được tạo ở thao tác khác. Vui lòng thử lại."), 409
        return jsonify(error=f"Không thể lưu tài khoản sinh viên: {exc}"), 500

    return jsonify(
        success=True,
        uid=user.uid,
        linkedExistingAccount=linked_existing_account,
    ), 201


@notification_api_bp.patch("/api/admin/departments/<department_id>")
def update_department(department_id):
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được sửa khoa."), 403
    department_id = str(department_id or "").strip().upper()
    name = str((request.get_json(silent=True) or {}).get("tenkhoa") or "").strip()
    if len(name) < 2 or len(name) > 100:
        return jsonify(error="Tên khoa phải có từ 2 đến 100 ký tự."), 400
    reference = firestore.client().collection("khoa").document(department_id)
    if not reference.get().exists:
        return jsonify(error="Khoa không tồn tại."), 404
    reference.update({"tenkhoa": name})
    return jsonify(success=True), 200


@notification_api_bp.delete("/api/admin/departments/<department_id>")
def delete_department(department_id):
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được xóa khoa."), 403
    department_id = str(department_id or "").strip().upper()
    database = firestore.client()
    reference = database.collection("khoa").document(department_id)
    if not reference.get().exists:
        return jsonify(error="Khoa không tồn tại."), 404

    references = []
    collection_labels = {
        "sinhvien": "sinh viên",
        "giaovien": "giáo viên",
        "monhoc": "môn học",
    }
    for collection_name, collection_label in collection_labels.items():
        count = 0
        for snapshot in database.collection(collection_name).stream():
            data = snapshot.to_dict() or {}
            if str(data.get("makhoa") or "").strip().upper() == department_id:
                count += 1
        if count:
            references.append(f"{count} {collection_label}")
    if references:
        return jsonify(
            error="Không thể xóa khoa đang được sử dụng bởi " + ", ".join(references) + "."
        ), 409

    reference.delete()
    return jsonify(success=True), 200


LOCAL_TIMEZONE = timezone(timedelta(hours=7), name="Asia/Ho_Chi_Minh")


def _timestamp_millis(value):
    return int(value.timestamp() * 1000) if isinstance(value, datetime) else 0


def _normalize_identity_text(value):
    normalized = unicodedata.normalize("NFD", str(value or "").strip().lower())
    normalized = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return re.sub(r"\s+", " ", normalized.replace("đ", "d"))


def _analyze_unlock_message(database, email, message):
    aliases = {
        "ma": "code", "ma so": "code",
        "ho ten": "name", "ten": "name",
        "khoa": "department",
        "email": "email",
        "ly do": "reason", "noi dung": "reason",
    }
    submitted = {}
    for line in str(message or "").splitlines():
        if ":" not in line:
            continue
        label, value = line.split(":", 1)
        field = aliases.get(_normalize_identity_text(label))
        if field and field not in submitted:
            submitted[field] = value.strip()

    profile = None
    profile_code = ""
    for collection_name in ("sinhvien", "giaovien"):
        for snapshot in database.collection(collection_name).stream():
            data = snapshot.to_dict() or {}
            if str(data.get("mail") or "").strip().lower() == email:
                profile = data
                profile_code = snapshot.id
                break
        if profile is not None:
            break

    department_code = str((profile or {}).get("makhoa") or "").strip()
    department_name = ""
    if department_code:
        department = database.collection("khoa").document(department_code).get()
        if department.exists:
            department_name = str((department.to_dict() or {}).get("tenkhoa") or "")

    expected_code = str((profile or {}).get("masv") or (profile or {}).get("magv") or profile_code)
    expected_name = str((profile or {}).get("hoten") or "")
    department_value = _normalize_identity_text(submitted.get("department"))
    checks = [
        ("Mã", bool(profile) and _normalize_identity_text(submitted.get("code")) == _normalize_identity_text(expected_code)),
        ("Họ tên", bool(profile) and _normalize_identity_text(submitted.get("name")) == _normalize_identity_text(expected_name)),
        ("Khoa", bool(profile) and department_value in {
            _normalize_identity_text(department_code), _normalize_identity_text(department_name)
        }),
        ("Email", _normalize_identity_text(submitted.get("email")) == _normalize_identity_text(email)),
    ]
    return {
        "score": sum(1 for _, passed in checks if passed),
        "total": len(checks),
        "details": [{"label": label, "passed": passed} for label, passed in checks],
    }


@notification_api_bp.post("/api/presence/heartbeat")
def presence_heartbeat():
    """Record one lightweight presence sample per user every five-minute bucket."""
    try:
        identity = _current_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not identity or identity["role"] not in {"sinhvien", "giaovien"}:
        return jsonify(success=True, tracked=False), 200

    now = datetime.now(LOCAL_TIMEZONE)
    bucket = now.minute // 5
    document_id = f"{now:%Y-%m-%d}_{now:%H}_{bucket:02d}_{identity['uid']}"
    firestore.client().collection("presence_events").document(document_id).set({
        "uid": identity["uid"],
        "role": identity["role"],
        "date": now.strftime("%Y-%m-%d"),
        "hour": now.hour,
        "bucket": bucket,
        "lastSeen": firestore.SERVER_TIMESTAMP,
    }, merge=True)
    return jsonify(success=True, tracked=True, nextHeartbeatSeconds=300), 200


def _schedule_overlaps(first, second):
    if int(first.get("hocky") or 0) != int(second.get("hocky") or 0):
        return False
    if int(first.get("namhoc") or 0) != int(second.get("namhoc") or 0):
        return False
    if int(first.get("thu") or 0) != int(second.get("thu") or 0):
        return False
    first_start_date = str(first.get("ngaybatdauhoc") or "")
    first_end_date = str(first.get("ngayketthuchoc") or "")
    second_start_date = str(second.get("ngaybatdauhoc") or "")
    second_end_date = str(second.get("ngayketthuchoc") or "")
    date_overlap = (
        not all((first_start_date, first_end_date, second_start_date, second_end_date))
        or (first_start_date <= second_end_date and first_end_date >= second_start_date)
    )
    return date_overlap and (
        str(first.get("giobatdau") or "") < str(second.get("gioketthuc") or "")
        and str(first.get("gioketthuc") or "") > str(second.get("giobatdau") or "")
    )


@notification_api_bp.get("/api/admin/dashboard")
def admin_dashboard():
    """Aggregate Firestore data into a compact payload for the admin dashboard."""
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được xem dashboard."), 403

    try:
        database = firestore.client()

        def read_collection(name):
            return [
                {"id": snapshot.id, **(snapshot.to_dict() or {})}
                for snapshot in database.collection(name).stream()
            ]

        students = read_collection("sinhvien")
        teachers = read_collection("giaovien")
        departments = read_collection("khoa")
        subjects = read_collection("monhoc")
        courses = read_collection("lopmon")
        registrations = read_collection("dangky")

        department_names = {
            str(item["id"]): str(item.get("tenkhoa") or item["id"])
            for item in departments
        }
        student_department_counts = Counter(
            str(item.get("makhoa") or "Chưa xác định") for item in students
        )
        students_by_department = [
            {
                "code": code,
                "label": department_names.get(code, code),
                "value": count,
            }
            for code, count in sorted(
                student_department_counts.items(), key=lambda item: (-item[1], item[0])
            )
        ]

        intake_counts = Counter(
            str(item.get("namnhaphoc") or "Chưa rõ") for item in students
        )
        students_by_intake = [
            {"label": year, "value": count}
            for year, count in sorted(intake_counts.items(), key=lambda item: item[0])
        ]

        def is_open(course):
            status = str(course.get("trangthai") or "").strip().upper()
            return status in {"MỞ", "MO"}

        open_courses = sum(1 for course in courses if is_open(course))
        total_capacity = sum(max(0, int(course.get("sisotoida") or 0)) for course in courses)
        occupied_seats = sum(max(0, int(course.get("sisodadangky") or 0)) for course in courses)
        subject_names = {
            str(item["id"]): str(item.get("tenmon") or item["id"])
            for item in subjects
        }
        top_courses = sorted(
            (
                {
                    "id": str(course["id"]),
                    "label": subject_names.get(str(course.get("mamon") or ""), str(course["id"])),
                    "registered": max(0, int(course.get("sisodadangky") or 0)),
                    "capacity": max(0, int(course.get("sisotoida") or 0)),
                }
                for course in courses
            ),
            key=lambda item: (-item["registered"], item["id"]),
        )[:6]

        teacher_names = {
            str(item["id"]): str(item.get("hoten") or item["id"])
            for item in teachers
        }
        courses_by_id = {str(course["id"]): course for course in courses}
        teachers_by_period = {}
        period_metadata = {}

        for course in courses:
            year = int(course.get("namhoc") or 0)
            semester = int(course.get("hocky") or 0)
            teacher_id = str(course.get("magv") or "").strip()
            if not year or not semester or not teacher_id:
                continue
            period_key = f"{year}|{semester}"
            period_metadata[period_key] = (year, semester)
            teachers_by_period.setdefault(period_key, Counter()).setdefault(teacher_id, 0)

        for registration in registrations:
            course = courses_by_id.get(str(registration.get("malopmon") or "").strip())
            if not course:
                continue
            year = int(course.get("namhoc") or 0)
            semester = int(course.get("hocky") or 0)
            teacher_id = str(course.get("magv") or "").strip()
            if not year or not semester or not teacher_id:
                continue
            period_key = f"{year}|{semester}"
            period_metadata[period_key] = (year, semester)
            teachers_by_period.setdefault(period_key, Counter())[teacher_id] += 1

        ordered_periods = sorted(
            period_metadata.items(), key=lambda item: item[1], reverse=True
        )
        teacher_popularity = {
            "periods": [
                {
                    "key": key,
                    "label": f"Học kỳ {semester} · {year}–{year + 1}",
                }
                for key, (year, semester) in ordered_periods
            ],
            "data": {
                key: sorted(
                    [
                        {
                            "id": teacher_id,
                            "label": teacher_names.get(teacher_id, teacher_id),
                            "value": count,
                        }
                        for teacher_id, count in teachers_by_period.get(key, {}).items()
                    ],
                    key=lambda item: (-item["value"], item["label"]),
                )
                for key, _ in ordered_periods
            },
        }

        today = datetime.now(LOCAL_TIMEZONE).strftime("%Y-%m-%d")
        presence_by_hour = {
            hour: {"sinhvien": set(), "giaovien": set()}
            for hour in range(24)
        }
        currently_online = {"sinhvien": set(), "giaovien": set()}
        online_threshold = datetime.now(timezone.utc).timestamp() - 10 * 60
        presence_snapshots = database.collection("presence_events").where(
            "date", "==", today
        ).stream()
        for snapshot in presence_snapshots:
            item = snapshot.to_dict() or {}
            role = str(item.get("role") or "")
            uid = str(item.get("uid") or "")
            hour = int(item.get("hour") or 0)
            if role not in {"sinhvien", "giaovien"} or not uid or hour not in presence_by_hour:
                continue
            presence_by_hour[hour][role].add(uid)
            last_seen = item.get("lastSeen")
            if isinstance(last_seen, datetime) and last_seen.timestamp() >= online_threshold:
                currently_online[role].add(uid)
        online_activity = {
            "date": today,
            "studentsOnlineNow": len(currently_online["sinhvien"]),
            "teachersOnlineNow": len(currently_online["giaovien"]),
            "hours": [
                {
                    "hour": hour,
                    "label": f"{hour:02d}:00",
                    "students": len(presence_by_hour[hour]["sinhvien"]),
                    "teachers": len(presence_by_hour[hour]["giaovien"]),
                }
                for hour in range(24)
            ],
        }

        return jsonify(
            generatedAt=datetime.now(timezone.utc).isoformat(),
            summary={
                "students": len(students),
                "teachers": len(teachers),
                "departments": len(departments),
                "subjects": len(subjects),
                "courses": len(courses),
                "openCourses": open_courses,
                "registrations": len(registrations),
                "fillRate": round((occupied_seats / total_capacity * 100), 1) if total_capacity else 0,
            },
            studentsByDepartment=students_by_department,
            studentsByIntake=students_by_intake,
            courseStatus=[
                {"label": "Đang mở", "value": open_courses},
                {"label": "Đã đóng", "value": len(courses) - open_courses},
            ],
            topCourses=top_courses,
            teacherPopularity=teacher_popularity,
            onlineActivity=online_activity,
        )
    except Exception as error:
        return jsonify(error=f"Không thể tổng hợp dữ liệu dashboard: {error}"), 500


@notification_api_bp.post("/api/admin/course-schedule/<course_id>")
def update_course_schedule(course_id):
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được sửa lịch lớp môn."), 403

    payload = request.get_json(silent=True) or {}
    required = (
        "mamon", "magv", "hocky", "namhoc", "sisotoida", "ngaybatdaudk",
        "ngayketthucdk", "thu", "giobatdau", "gioketthuc", "ngaybatdauhoc", "ngayketthuchoc",
    )
    if any(payload.get(field) in (None, "") for field in required):
        return jsonify(error="Thông tin lớp môn chưa đầy đủ."), 400

    database = firestore.client()
    course_ref = database.collection("lopmon").document(course_id)
    course_snapshot = course_ref.get()
    if not course_snapshot.exists:
        return jsonify(error="Lớp môn cần sửa không còn tồn tại."), 404

    update_data = {
        "mamon": str(payload["mamon"]).strip(),
        "magv": str(payload["magv"]).strip(),
        "hocky": int(payload["hocky"]),
        "namhoc": int(payload["namhoc"]),
        "sisotoida": int(payload["sisotoida"]),
        "ngaybatdaudk": str(payload["ngaybatdaudk"]),
        "ngayketthucdk": str(payload["ngayketthucdk"]),
        "thu": int(payload["thu"]),
        "giobatdau": str(payload["giobatdau"]),
        "gioketthuc": str(payload["gioketthuc"]),
        "ngaybatdauhoc": str(payload["ngaybatdauhoc"]),
        "ngayketthuchoc": str(payload["ngayketthuchoc"]),
    }
    current = course_snapshot.to_dict() or {}
    if update_data["sisotoida"] < int(current.get("sisodadangky") or 0):
        return jsonify(error="Sĩ số tối đa nhỏ hơn số sinh viên đã đăng ký."), 400

    for other_snapshot in database.collection("lopmon").where("magv", "==", update_data["magv"]).stream():
        if other_snapshot.id != course_id and _schedule_overlaps(update_data, other_snapshot.to_dict() or {}):
            return jsonify(error=f"Giáo viên đã có lớp {other_snapshot.id} trùng lịch."), 409

    registrations = list(database.collection("dangky").where("malopmon", "==", course_id).stream())
    affected = []
    for registration in registrations:
        registration_data = registration.to_dict() or {}
        student_id = str(registration_data.get("masv") or "").strip()
        conflicts = []
        if student_id:
            for other_registration in database.collection("dangky").where("masv", "==", student_id).stream():
                other_course_id = str((other_registration.to_dict() or {}).get("malopmon") or "").strip()
                if not other_course_id or other_course_id == course_id:
                    continue
                other_course = database.collection("lopmon").document(other_course_id).get()
                if other_course.exists and _schedule_overlaps(update_data, other_course.to_dict() or {}):
                    conflicts.append(other_course_id)
        affected.append({"snapshot": registration, "studentId": student_id, "conflicts": sorted(set(conflicts))})

    conflict_count = sum(1 for item in affected if item["conflicts"])
    if conflict_count and not payload.get("confirmConflicts"):
        return jsonify(requiresConfirmation=True, affectedCount=conflict_count), 409

    batch = database.batch()
    batch.update(course_ref, update_data)
    for item in affected:
        if item["conflicts"]:
            batch.update(item["snapshot"].reference, {
                "trangthai": "XUNG ĐỘT LỊCH",
                "lichcanxuly": True,
                "xungdotvoi": item["conflicts"],
                "capnhatlichluc": firestore.SERVER_TIMESTAMP,
            })
        else:
            batch.update(item["snapshot"].reference, {
                "trangthai": "ĐÃ ĐĂNG KÝ",
                "lichcanxuly": False,
                "xungdotvoi": [],
            })
    batch.commit()

    recipient_uids = []
    for item in affected:
        if not item["conflicts"] or not item["studentId"]:
            continue
        profile = database.collection("sinhvien").document(item["studentId"]).get()
        uid = str((profile.to_dict() or {}).get("uid") or "") if profile.exists else ""
        if uid:
            recipient_uids.append(uid)
    if recipient_uids:
        database.collection("notifications").document().set({
            "title": "Lịch học vừa thay đổi",
            "message": f"Lớp {course_id} vừa đổi lịch và gây trùng. Hãy vào Lịch học để chọn lớp muốn giữ.",
            "audiences": [],
            "recipientUids": sorted(set(recipient_uids)),
            "recipientType": "sinhvien",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "createdBy": admin["uid"],
            "createdByEmail": admin["email"],
        })

    return jsonify(success=True, affectedCount=conflict_count), 200


@notification_api_bp.post("/api/student/schedule-conflict/resolve")
def resolve_schedule_conflict():
    try:
        identity = _current_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not identity or identity["role"] != "sinhvien" or not identity["masv"]:
        return jsonify(error="Chỉ sinh viên được xử lý lịch của mình."), 403

    payload = request.get_json(silent=True) or {}
    keep_course = str(payload.get("keepCourse") or "").strip()
    drop_course = str(payload.get("dropCourse") or "").strip()
    if not keep_course or not drop_course or keep_course == drop_course:
        return jsonify(error="Lựa chọn lớp môn không hợp lệ."), 400

    database = firestore.client()
    student_id = identity["masv"]
    keep_registration_ref = database.collection("dangky").document(f"{student_id}_{keep_course}")
    drop_registration_ref = database.collection("dangky").document(f"{student_id}_{drop_course}")
    keep_course_ref = database.collection("lopmon").document(keep_course)
    drop_course_ref = database.collection("lopmon").document(drop_course)
    transaction = database.transaction()

    @firestore.transactional
    def apply_resolution(current_transaction):
        keep_registration = keep_registration_ref.get(transaction=current_transaction)
        drop_registration = drop_registration_ref.get(transaction=current_transaction)
        keep_course_snapshot = keep_course_ref.get(transaction=current_transaction)
        drop_course_snapshot = drop_course_ref.get(transaction=current_transaction)
        if not keep_registration.exists or not drop_registration.exists:
            raise ValueError("Đăng ký cần xử lý không còn tồn tại.")
        if (
            str((keep_registration.to_dict() or {}).get("masv") or "") != student_id
            or str((drop_registration.to_dict() or {}).get("masv") or "") != student_id
        ):
            raise PermissionError("Bạn không có quyền xử lý đăng ký này.")
        if not keep_course_snapshot.exists or not drop_course_snapshot.exists:
            raise ValueError("Lớp môn không còn tồn tại.")
        if not _schedule_overlaps(keep_course_snapshot.to_dict() or {}, drop_course_snapshot.to_dict() or {}):
            raise ValueError("Hai lớp này không còn trùng lịch.")

        current_transaction.delete(drop_registration_ref)
        current_transaction.update(keep_registration_ref, {
            "trangthai": "ĐÃ ĐĂNG KÝ",
            "lichcanxuly": False,
            "xungdotvoi": [],
        })
        current_capacity = int((drop_course_snapshot.to_dict() or {}).get("sisodadangky") or 0)
        current_transaction.update(drop_course_ref, {"sisodadangky": max(0, current_capacity - 1)})

    try:
        apply_resolution(transaction)
    except PermissionError as exc:
        return jsonify(error=str(exc)), 403
    except ValueError as exc:
        return jsonify(error=str(exc)), 409

    return jsonify(success=True, keptCourse=keep_course, droppedCourse=drop_course), 200


def _serialize_unlock_request(snapshot):
    data = snapshot.to_dict() or {}
    validation_details = [
        detail for detail in list(data.get("validationDetails") or [])
        if str(detail.get("label") or "").strip().lower() != "lý do"
    ]
    validation_score = (
        sum(1 for detail in validation_details if detail.get("passed"))
        if validation_details
        else min(int(data.get("validationScore") or 0), 4)
    )
    return {
        "id": snapshot.id,
        "email": str(data.get("email") or ""),
        "message": str(data.get("message") or ""),
        "status": str(data.get("status") or "pending"),
        "createdAtMillis": _timestamp_millis(data.get("createdAt")),
        "decidedAtMillis": _timestamp_millis(data.get("decidedAt")),
        "validationScore": validation_score,
        "validationTotal": len(validation_details) or 4,
        "validationDetails": validation_details,
        "requestType": str(data.get("requestType") or "login_lockout"),
        "accessGranted": bool(data.get("accessGranted")),
    }


def _apply_unlock_approval_effect(database, reference, data):
    """Apply an approved request once and return its effective access state."""
    if str(data.get("status") or "pending").lower() != "approved":
        return {
            "accessGranted": False,
            "graceUntilMillis": _timestamp_millis(data.get("graceUntil")),
        }

    if data.get("approvalEffectApplied"):
        stored_grace_until = data.get("graceUntil")
        grace_is_active = bool(
            isinstance(stored_grace_until, datetime)
            and datetime.now(timezone.utc) < stored_grace_until
        )
        return {
            "accessGranted": bool(data.get("accessGranted") and grace_is_active),
            "graceUntilMillis": _timestamp_millis(stored_grace_until),
        }

    email = str(data.get("email") or "").strip().lower()
    access_granted = False
    grace_until = None
    target_uid = ""
    try:
        auth_user = get_firebase_auth().get_user_by_email(email)
        target_uid = str(auth_user.uid or "")
        profile_ref = database.collection("users").document(target_uid)
        profile_snapshot = profile_ref.get()
        profile = profile_snapshot.to_dict() or {} if profile_snapshot.exists else {}
        # A temporary password must always be changed and cannot be bypassed by approval.
        access_granted = bool(profile_snapshot.exists and not profile.get("mustChangePassword"))
        if access_granted:
            now = datetime.now(timezone.utc)
            grace_until = now + timedelta(seconds=PASSWORD_EXPIRY_GRACE_SECONDS)
            profile_ref.set({
                "passwordExpiryGraceUntil": grace_until,
                "passwordExpiryGraceApprovedAt": now,
                "passwordExpiryGraceApprovedBy": str(data.get("decidedBy") or ""),
            }, merge=True)
            _identity_cache.pop(target_uid, None)
    except Exception:
        # Leave the effect unapplied so a transient Firebase/Firestore failure can retry.
        return {"accessGranted": False, "graceUntilMillis": 0}

    request_update = {
        "approvalEffectApplied": True,
        "accessGranted": access_granted,
        "approvalEffectAppliedAt": datetime.now(timezone.utc),
    }
    if grace_until:
        request_update["graceUntil"] = grace_until
    reference.update(request_update)
    return {
        "accessGranted": access_granted,
        "graceUntilMillis": _timestamp_millis(grace_until),
    }


@notification_api_bp.post("/api/login-unlock-requests")
def create_login_unlock_request():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email") or "").strip().lower()
    message = str(payload.get("message") or "").strip()
    request_type = str(payload.get("requestType") or "login_lockout").strip().lower()
    if request_type not in {"login_lockout", "password_expired"}:
        request_type = "login_lockout"
    if not email or "@" not in email or len(email) > 254:
        return jsonify(error="Email không hợp lệ."), 400
    if len(message) > 800:
        return jsonify(error="Lời nhắn không được vượt quá 800 ký tự."), 400

    try:
        get_firebase_auth().get_user_by_email(email)
    except Exception:
        return jsonify(error="Không tìm thấy tài khoản tương ứng với email này."), 404

    database = firestore.client()
    for snapshot in database.collection("login_unlock_requests").stream():
        current = snapshot.to_dict() or {}
        if str(current.get("email") or "").lower() == email and str(current.get("status") or "pending") == "pending":
            return jsonify(success=True, id=snapshot.id, alreadySent=True), 200

    analysis = _analyze_unlock_message(database, email, message)
    document = database.collection("login_unlock_requests").document()
    document.set({
        "email": email,
        "message": message,
        "requestType": request_type,
        "status": "pending",
        "validationScore": analysis["score"],
        "validationTotal": analysis["total"],
        "validationDetails": analysis["details"],
        "createdAt": firestore.SERVER_TIMESTAMP,
    })
    database.collection("notifications").document().set({
        "title": "Yêu cầu mở khóa đăng nhập",
        "message": (
            f"Tài khoản {email} yêu cầu mở khóa. "
            f"Đối chiếu tự động: {analysis['score']}/{analysis['total']} tiêu chí.\n\n"
            f"Nội dung người dùng gửi:\n{message or '(Không có lời nhắn)'}"
        ),
        "audiences": ["admin"],
        "recipientUids": [],
        "recipientType": "admin",
        "createdAt": firestore.SERVER_TIMESTAMP,
        "createdBy": "login-lockout",
        "createdByEmail": email,
        "actionType": "login_unlock",
        "actionId": document.id,
    })
    return jsonify(
        success=True,
        id=document.id,
    ), 201


@notification_api_bp.get("/api/login-unlock-requests/<request_id>/status")
def login_unlock_request_status(request_id):
    database = firestore.client()
    reference = database.collection("login_unlock_requests").document(request_id)
    snapshot = reference.get()
    if not snapshot.exists:
        return jsonify(error="Yêu cầu không tồn tại."), 404
    data = snapshot.to_dict() or {}
    effect = _apply_unlock_approval_effect(database, reference, data)
    return jsonify(
        status=str(data.get("status") or "pending"),
        **effect,
    ), 200


@notification_api_bp.post("/api/login-unlock-requests/latest-status")
def latest_login_unlock_request_status():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email") or "").strip().lower()
    if not email or "@" not in email or len(email) > 254:
        return jsonify(error="Email không hợp lệ."), 400

    database = firestore.client()
    matching = []
    for snapshot in database.collection("login_unlock_requests").stream():
        data = snapshot.to_dict() or {}
        if str(data.get("email") or "").strip().lower() == email:
            matching.append((snapshot, data))
    if not matching:
        return jsonify(status="none"), 200

    snapshot, data = max(
        matching,
        key=lambda item: (_timestamp_millis(item[1].get("createdAt")), item[0].id),
    )
    effect = _apply_unlock_approval_effect(database, snapshot.reference, data)
    return jsonify(
        id=snapshot.id,
        status=str(data.get("status") or "pending"),
        **effect,
    ), 200


@notification_api_bp.get("/api/admin/login-unlock-requests")
def list_login_unlock_requests():
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được xem yêu cầu mở khóa."), 403
    snapshots = list(firestore.client().collection("login_unlock_requests").stream())
    items = [_serialize_unlock_request(snapshot) for snapshot in snapshots]
    items.sort(key=lambda item: item["createdAtMillis"], reverse=True)
    return jsonify(requests=items[:200]), 200


@notification_api_bp.delete("/api/admin/login-unlock-requests/processed")
def cleanup_processed_login_unlock_requests():
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được dọn dẹp yêu cầu mở khóa."), 403

    database = firestore.client()
    processed = []
    for snapshot in database.collection("login_unlock_requests").stream():
        data = snapshot.to_dict() or {}
        if str(data.get("status") or "pending").lower() in {"approved", "rejected"}:
            processed.append(snapshot)

    processed_ids = {snapshot.id for snapshot in processed}
    related_notifications = []
    if processed_ids:
        for snapshot in database.collection("notifications").stream():
            data = snapshot.to_dict() or {}
            if (
                str(data.get("actionType") or "") == "login_unlock"
                and str(data.get("actionId") or "") in processed_ids
            ):
                related_notifications.append(snapshot)

    references = [snapshot.reference for snapshot in processed]
    references.extend(snapshot.reference for snapshot in related_notifications)
    for start in range(0, len(references), 400):
        batch = database.batch()
        for reference in references[start:start + 400]:
            batch.delete(reference)
        batch.commit()

    return jsonify(
        success=True,
        deletedRequests=len(processed),
        deletedNotifications=len(related_notifications),
    ), 200


@notification_api_bp.patch("/api/admin/login-unlock-requests/<request_id>")
def decide_login_unlock_request(request_id):
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được xử lý yêu cầu mở khóa."), 403

    payload = request.get_json(silent=True) or {}
    status = str(payload.get("status") or "").strip().lower()
    if status not in {"approved", "rejected"}:
        return jsonify(error="Quyết định không hợp lệ."), 400

    database = firestore.client()
    reference = database.collection("login_unlock_requests").document(request_id)
    snapshot = reference.get()
    if not snapshot.exists:
        return jsonify(error="Yêu cầu không còn tồn tại."), 404
    current = snapshot.to_dict() or {}
    if str(current.get("status") or "pending") != "pending":
        return jsonify(error="Yêu cầu này đã được xử lý."), 409

    decided_at = datetime.now(timezone.utc)
    reference.update({
        "status": status,
        "decidedAt": decided_at,
        "decidedBy": admin["uid"],
    })
    effect = _apply_unlock_approval_effect(database, reference, {
        **current,
        "status": status,
        "decidedAt": decided_at,
        "decidedBy": admin["uid"],
    })
    return jsonify(success=True, status=status, **effect), 200


def _serialize_notification(snapshot):
    data = snapshot.to_dict() or {}
    created_at = data.get("createdAt")
    updated_at = data.get("updatedAt")
    return {
        "id": snapshot.id,
        "title": str(data.get("title", "")),
        "message": str(data.get("message", "")),
        "audiences": list(data.get("audiences") or []),
        "recipientUids": list(data.get("recipientUids") or []),
        "recipientType": str(data.get("recipientType", "")),
        "createdByEmail": str(data.get("createdByEmail", "")),
        "actionType": str(data.get("actionType", "")),
        "actionId": str(data.get("actionId", "")),
        "createdAtMillis": int(created_at.timestamp() * 1000) if created_at else 0,
        "updatedAtMillis": int(updated_at.timestamp() * 1000) if updated_at else 0,
    }


def _notification_payload(data):
    title = str(data.get("title", "")).strip()
    message = str(data.get("message", "")).strip()
    mode = str(data.get("recipientMode") or data.get("audience") or "").strip().lower()
    if not title or len(title) > 100:
        raise ValueError("Tiêu đề phải có từ 1 đến 100 ký tự.")
    if not message or len(message) > 1000:
        raise ValueError("Nội dung phải có từ 1 đến 1000 ký tự.")

    legacy_modes = {
        "both": "both_all",
        "sinhvien": "sinhvien_all",
        "giaovien": "giaovien_all",
    }
    mode = legacy_modes.get(mode, mode)
    if mode == "both_all":
        return title, message, ["sinhvien", "giaovien"], [], ""
    if mode in {"sinhvien_all", "giaovien_all"}:
        role = mode.removesuffix("_all")
        return title, message, [role], [], role
    if mode not in {"sinhvien_filter", "giaovien_filter"}:
        raise ValueError("Nhóm người nhận không hợp lệ.")

    recipient_type = mode.removesuffix("_filter")
    requested_uids = {
        str(uid).strip()
        for uid in (data.get("recipientUids") or [])
        if str(uid).strip()
    }
    if not requested_uids:
        raise ValueError("Hãy chọn ít nhất một người nhận.")
    collection_name = "sinhvien" if recipient_type == "sinhvien" else "giaovien"
    valid_uids = {
        str((snapshot.to_dict() or {}).get("uid", "")).strip()
        for snapshot in firestore.client().collection(collection_name).stream()
    }
    valid_uids.discard("")
    if not requested_uids.issubset(valid_uids):
        raise ValueError("Danh sách người nhận chứa tài khoản không hợp lệ.")
    return title, message, [], sorted(requested_uids), recipient_type


@notification_api_bp.post("/api/notifications")
def create_notification():
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được gửi thông báo."), 403

    data = request.get_json(silent=True) or {}
    try:
        title, message, audiences, recipient_uids, recipient_type = _notification_payload(data)
    except ValueError as exc:
        return jsonify(error=str(exc)), 400
    document = firestore.client().collection("notifications").document()
    document.set({
        "title": title,
        "message": message,
        "audiences": audiences,
        "recipientUids": recipient_uids,
        "recipientType": recipient_type,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "createdBy": admin["uid"],
        "createdByEmail": admin["email"],
    })
    return jsonify(success=True, id=document.id), 201


@notification_api_bp.put("/api/notifications/<notification_id>")
def update_notification(notification_id):
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được sửa thông báo."), 403
    try:
        title, message, audiences, recipient_uids, recipient_type = _notification_payload(request.get_json(silent=True) or {})
    except ValueError as exc:
        return jsonify(error=str(exc)), 400
    reference = firestore.client().collection("notifications").document(notification_id)
    if not reference.get().exists:
        return jsonify(error="Thông báo không tồn tại."), 404
    reference.update({
        "title": title,
        "message": message,
        "audiences": audiences,
        "recipientUids": recipient_uids,
        "recipientType": recipient_type,
        "updatedAt": firestore.SERVER_TIMESTAMP,
        "updatedBy": admin["uid"],
    })
    return jsonify(success=True), 200


@notification_api_bp.delete("/api/notifications/<notification_id>")
def delete_notification(notification_id):
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được xóa thông báo."), 403
    reference = firestore.client().collection("notifications").document(notification_id)
    if not reference.get().exists:
        return jsonify(error="Thông báo không tồn tại."), 404
    reference.delete()
    return jsonify(success=True), 200


@notification_api_bp.get("/api/notification-recipients")
def list_notification_recipients():
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được xem danh sách người nhận."), 403
    recipient_type = str(request.args.get("type", "")).strip().lower()
    if recipient_type not in {"sinhvien", "giaovien"}:
        return jsonify(error="Loại người nhận không hợp lệ."), 400

    database = firestore.client()
    departments = {
        snapshot.id: str((snapshot.to_dict() or {}).get("tenkhoa", ""))
        for snapshot in database.collection("khoa").stream()
    }
    collection_name = "sinhvien" if recipient_type == "sinhvien" else "giaovien"
    code_field = "masv" if recipient_type == "sinhvien" else "magv"
    recipients = []
    for snapshot in database.collection(collection_name).stream():
        data = snapshot.to_dict() or {}
        uid = str(data.get("uid", "")).strip()
        if not uid:
            continue
        department_code = str(data.get("makhoa", "")).strip()
        birth_date = str(data.get("ngaysinh", "")).strip()
        recipients.append({
            "uid": uid,
            "code": snapshot.id or str(data.get(code_field, "")),
            "name": str(data.get("hoten", "")),
            "email": str(data.get("mail", "")),
            "departmentCode": department_code,
            "departmentName": departments.get(department_code, ""),
            "birthDate": birth_date,
            "birthYear": birth_date[:4] if len(birth_date) >= 4 else "",
            "enrollmentYear": str(data.get("namnhaphoc", "")) if recipient_type == "sinhvien" else "",
        })
    recipients.sort(key=lambda item: (item["name"].lower(), item["code"]))
    return jsonify(recipients=recipients), 200


@notification_api_bp.get("/api/notifications/stream")
def stream_notifications():
    try:
        identity = _current_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not identity:
        return jsonify(error="Bạn chưa đăng nhập."), 401

    updates = queue.Queue(maxsize=4)
    role = identity["role"]

    def on_snapshot(documents, changes, read_time):
        visible = []
        for snapshot in documents:
            item = _serialize_notification(snapshot)
            if (
                role == "admin"
                or role in item["audiences"]
                or identity["uid"] in item["recipientUids"]
            ):
                visible.append(item)
        visible.sort(key=lambda item: item["createdAtMillis"], reverse=True)
        while not updates.empty():
            try:
                updates.get_nowait()
            except queue.Empty:
                break
        try:
            updates.put_nowait(visible[:50])
        except queue.Full:
            pass

    watcher = firestore.client().collection("notifications").on_snapshot(on_snapshot)

    @stream_with_context
    def generate():
        try:
            yield ": connected\n\n"
            while True:
                try:
                    items = updates.get(timeout=20)
                    yield "data: " + json.dumps(items, ensure_ascii=False) + "\n\n"
                except queue.Empty:
                    yield ": keepalive\n\n"
        except (GeneratorExit, ConnectionError):
            return
        finally:
            watcher.unsubscribe()

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )


@notification_api_bp.post("/api/profile/avatar")
def update_avatar():
    try:
        identity = _current_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not identity:
        return jsonify(error="Bạn chưa đăng nhập."), 401

    data_url = str((request.get_json(silent=True) or {}).get("avatarDataUrl", ""))
    prefix = "data:image/jpeg;base64,"
    if not data_url.startswith(prefix):
        return jsonify(error="Định dạng ảnh không hợp lệ."), 400
    try:
        raw = base64.b64decode(data_url.removeprefix(prefix), validate=True)
    except (ValueError, binascii.Error):
        return jsonify(error="Dữ liệu ảnh không hợp lệ."), 400
    if len(raw) > 300 * 1024:
        return jsonify(error="Ảnh sau khi nén vẫn quá lớn."), 400

    firestore.client().collection("users").document(identity["uid"]).update({
        "avatarDataUrl": data_url,
        "avatarUpdatedAt": firestore.SERVER_TIMESTAMP,
    })
    return jsonify(success=True), 200
