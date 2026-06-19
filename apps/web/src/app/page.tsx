import { redirect } from 'next/navigation';

export default function Home() {
  // Redirigimos automáticamente al panel principal del SaaS
  redirect('/dashboard');
}
