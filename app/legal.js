import Link from "next/link";
import "./globals.css";
import { Icon, BrandMark } from "./icons";
import { ThemeToggle } from "./theme-toggle";

/* ============================================================
   PLACEHOLDERS — CHANGE THESE BEFORE THE SITE GOES PUBLIC.
   `contactEmail` and `jurisdiction` are the two facts a privacy
   policy and a set of terms cannot be written without, and they
   are the two this project has no source of truth for. Everything
   else below is written from what the code in this repo actually
   does (see lib/, scripts/, db/schema.sql) rather than from a
   generic boilerplate template.

   These documents are a good-faith first draft, not legal advice.
   Have them reviewed by a qualified lawyer for the jurisdiction
   you actually operate in before relying on them.
   ============================================================ */
export const LEGAL = {
  product: "TheWinningLoop",
  contactEmail: "support@thewinningloop.com",
  jurisdiction: "the State of Delaware, United States",
  updated: "17 September 2026",
};

const BRAND_NAME = LEGAL.product;

/* Shared chrome for the two legal documents: a slim top bar (brand, back into
   the app, theme toggle) over a single ~72ch reading column. No sidebar — a
   public document must not look like a gate into the product, and Meta/Google
   app review fetches these anonymously. */
export function LegalShell({ icon, title, intro, children }) {
  const I = Icon[icon] || Icon.document;
  return (
    <div className="legal-page">
      <header className="legal-top">
        <Link
          className="legal-brand"
          href="/"
          aria-label={`${BRAND_NAME} home`}
        >
          <BrandMark size={18} />
          <span className="brand-name">
            The<em>WinningLoop</em>
          </span>
        </Link>
        <div className="legal-top-right">
          <Link className="legal-back" href="/">
            Back to app <Icon.link size={12} />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="legal-wrap">
        <div className="legal-head">
          <span className="legal-icon" aria-hidden="true">
            <I size={20} />
          </span>
          <div>
            <h1>{title}</h1>
            <p>{intro}</p>
            <p className="legal-meta">Last updated {LEGAL.updated}</p>
          </div>
        </div>

        <div className="legal-body">{children}</div>

        <footer className="legal-foot">
          <span>
            {BRAND_NAME} · {LEGAL.contactEmail}
          </span>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <Link href="/privacy">Privacy Policy</Link>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <Link href="/terms">Terms &amp; Conditions</Link>
        </footer>
      </main>
    </div>
  );
}
