import { notFound } from "next/navigation";
import { TrustEmbedCard } from "@/components/embed/TrustEmbedCard";
import { buildTokenPassport } from "@/lib/trust-passport";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { mint: string } }) {
  const passport = await buildTokenPassport(params.mint);
  return {
    title: passport ? `${passport.token.symbol} Trust Embed - SignalCred` : "Trust Embed - SignalCred",
    description: passport
      ? `Embeddable SignalCred trust score for ${passport.token.name}.`
      : "Embeddable SignalCred trust score for Bags tokens.",
    robots: { index: false, follow: true },
  };
}

export default async function TrustEmbedPage({ params }: { params: { mint: string } }) {
  const passport = await buildTokenPassport(params.mint);
  if (!passport) notFound();

  return <TrustEmbedCard passport={passport} />;
}
