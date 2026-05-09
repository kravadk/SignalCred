import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { comments, posts } from "@/db/schema";
import { db } from "@/lib/db";
import { buildTokenSocialContext } from "@/lib/token-social-proof";
import { bagsTokenUrl, shortAddress, solscanUrl } from "@/components/ui/ExplorerLink";
import { formatTimeAgo, shortWallet } from "@/lib/utils";

export const metadata = { title: "Square Post - SignalCred" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function SquarePostPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const post = await db.query.posts.findFirst({ where: eq(posts.id, params.id) });
  if (!post || post.visibility !== "public") notFound();

  const [commentRows, quotedPost, tokenContext] = await Promise.all([
    db.select().from(comments).where(eq(comments.postId, params.id)),
    post.quotedPostId ? db.query.posts.findFirst({ where: eq(posts.id, post.quotedPostId) }) : Promise.resolve(null),
    post.tokenMint ? buildTokenSocialContext(post.tokenMint).catch(() => null) : Promise.resolve(null),
  ]);

  const completedMilestones = tokenContext?.milestones.filter((item) => item.status === "completed").length ?? 0;
  const totalMilestones = tokenContext?.milestones.length ?? 0;

  return (
    <main className="square-dark min-h-screen px-4 py-5 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/square" className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/65 hover:text-white">
          Back to Square
        </Link>

        <article className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#101018]/95">
          <header className="border-b border-white/[0.07] px-5 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">Square Post Detail</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-white">{shortWallet(post.authorWallet ?? "anon")}</h1>
              <span className="rounded-md bg-white/8 px-2 py-1 text-xs font-black uppercase text-white/55">{post.postType}</span>
              {post.pinnedForToken && <span className="rounded-md bg-emerald-400/12 px-2 py-1 text-xs font-black text-emerald-300">Pinned official</span>}
              <span className="text-sm font-semibold text-white/35">{formatTimeAgo(post.createdAt)}</span>
            </div>
          </header>

          <section className="px-5 py-5">
            {post.tokenMint && (
              <div className="mb-4 flex flex-wrap gap-2">
                <Link href={`/token/${post.tokenMint}`} className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-black text-white hover:bg-white/12">
                  Token {shortAddress(post.tokenMint)}
                </Link>
                <Link href={`/passport/${post.tokenMint}`} className="rounded-full bg-emerald-400/12 px-3 py-1.5 text-xs font-black text-emerald-300 hover:bg-emerald-400/18">
                  Trust Passport
                </Link>
                <a href={solscanUrl(post.tokenMint, "token")} target="_blank" rel="noreferrer" className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-black text-white/65 hover:text-white">
                  Solscan
                </a>
                <a href={bagsTokenUrl(post.tokenMint)} target="_blank" rel="noreferrer" className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-black text-white/65 hover:text-white">
                  Bags.fm
                </a>
              </div>
            )}

            <p className="whitespace-pre-wrap text-base font-semibold leading-8 text-white">{post.content}</p>

            {quotedPost && (
              <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.035] p-4">
                <p className="mb-1 text-xs font-bold text-white/35">Quoted proof by {shortWallet(quotedPost.authorWallet ?? "anon")}</p>
                <p className="text-sm font-semibold leading-6 text-white/75">{quotedPost.content}</p>
              </div>
            )}

            {tokenContext && (
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Social score</p>
                  <p className="mt-1 font-mono text-lg font-black text-white">{tokenContext.socialProof.socialScore}</p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Milestones</p>
                  <p className="mt-1 font-mono text-lg font-black text-white">{completedMilestones}/{totalMilestones}</p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Campaigns</p>
                  <p className="mt-1 font-mono text-lg font-black text-white">{tokenContext.campaigns.length}</p>
                </div>
              </div>
            )}
          </section>

          <section className="border-t border-white/[0.07] px-5 py-4">
            <h2 className="mb-3 text-sm font-black text-white">Replies</h2>
            {commentRows.length === 0 ? (
              <p className="text-sm font-semibold text-white/40">No replies yet.</p>
            ) : (
              <div className="space-y-3">
                {commentRows.map((comment) => (
                  <div key={comment.id} className="rounded-xl bg-white/[0.035] px-4 py-3">
                    <p className="text-xs font-bold text-white/35">{shortWallet(comment.authorWallet ?? "anon")}</p>
                    <p className="mt-1 text-sm font-semibold text-white/75">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </article>
      </div>
    </main>
  );
}
