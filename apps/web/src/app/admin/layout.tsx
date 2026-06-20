import DefaultLayout from "@/components/layouts/default-layout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DefaultLayout>{children}</DefaultLayout>;
}
