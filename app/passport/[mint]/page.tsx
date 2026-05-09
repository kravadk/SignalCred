import { notFound } from "next/navigation";
import { TrustPassportPage } from "@/components/passport/TrustPassportPage";
import { buildTokenPassport } from "@/lib/trust-passport";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { mint: string } }) {
  const passport = await buildTokenPassport(params.mint);
  return {
    title: passport ? `${passport.token.symbol} Trust Passport - SignalCred` : "Trust Passport - SignalCred",
    description: passport
      ? `Verified proof passport for ${passport.token.name}: Bags source, pool, creator, fees, claims, social proof, and USDT campaign evidence.`
      : "SignalCred Trust Passport for Bags tokens.",
  };
}

export default async function PassportPage({ params }: { params: { mint: string } }) {
  const passport = await buildTokenPassport(params.mint);
  if (!passport) notFound();

  return <TrustPassportPage passport={passport} />;
}
