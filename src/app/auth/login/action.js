'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export async function loginAction(formData) {
  const studentId = formData.get('student_id');
  const password = formData.get('password');

  const user = await authenticate(studentId, password);

  if (!user) return { error: 'Invalid Student ID or Password' };

  cookies().set('user', JSON.stringify(user), { httpOnly: true });

  return redirect(user.role === 'admin' ? '/admin' : '/user');
}
