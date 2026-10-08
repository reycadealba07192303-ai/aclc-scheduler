import 'package:flutter/material.dart';

import 'package:aclc_teacher_portal/app/theme/app_theme.dart';
import 'package:aclc_teacher_portal/core/theme/app_colors.dart';
import 'package:aclc_teacher_portal/features/auth/data/auth_repository.dart';
import 'package:aclc_teacher_portal/features/auth/presentation/login_page.dart';
import 'package:aclc_teacher_portal/features/teacher_home/presentation/teacher_home_page.dart';

class TeacherSchedulerApp extends StatefulWidget {
  const TeacherSchedulerApp({super.key});
  @override
  State<TeacherSchedulerApp> createState() => _TeacherSchedulerAppState();
}

class _TeacherSchedulerAppState extends State<TeacherSchedulerApp> {
  var _loading = true;
  var _signedIn = false;

  @override
  void initState() {
    super.initState();
    AuthRepository.instance.restoreSession().then((value) {
      if (mounted) {
        setState(() {
          _signedIn = value;
          _loading = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'ACLC Teacher Portal',
    debugShowCheckedModeBanner: false,
    theme: AppTheme.light,
    home: _loading
        ? const Scaffold(
            body: Center(
              child: CircularProgressIndicator(color: AppColors.navy),
            ),
          )
        : _signedIn
        ? TeacherHomePage(
            onSignOut: () async {
              await AuthRepository.instance.signOut();
              if (mounted) setState(() => _signedIn = false);
            },
          )
        : LoginPage(
            onSignedIn: () {
              if (mounted) setState(() => _signedIn = true);
            },
          ),
  );
}
