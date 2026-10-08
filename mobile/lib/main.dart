import 'package:flutter/material.dart';

import 'package:aclc_teacher_portal/app/app.dart';
import 'package:aclc_teacher_portal/core/config/app_config.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppConfig.load();
  runApp(const TeacherSchedulerApp());
}
