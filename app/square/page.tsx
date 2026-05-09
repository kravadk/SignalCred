import { Feed } from "@/components/square/Feed";

export const metadata = { title: "Square - SignalCred" };

export default function SquarePage({ searchParams }: { searchParams?: { token?: string } }) {
  return <Feed initialTokenMint={searchParams?.token ?? null} />;
}
