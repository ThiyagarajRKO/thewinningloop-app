import { LegalShell, LEGAL } from "../legal";

export const metadata = {
  title: "Privacy Policy · AdVault",
  description:
    "What AdVault stores, where it comes from, how long it is kept, and how to have it removed.",
};

export default function PrivacyPolicy() {
  return (
    <LegalShell
      icon="shield"
      title="Privacy Policy"
      intro={`${LEGAL.product} is an advertising-research tool. It reads advertising that is already public on Meta's Ad Library and on public storefronts, and it has a single operator account rather than a user base. That shape is why this document is short: there is no sign-up, no audience profiling, and no personal information collected from visitors beyond what any web server records in its logs.`}
    >
      <section>
        <h2>
          <span className="n">01</span>Scope
        </h2>
        <p>
          This policy covers the {LEGAL.product} application and its API — the
          software you are using right now. It does not cover Meta, Google,
          Shopify or any other third-party service, each of which has its own
          privacy policy and its own relationship with you.
        </p>
        <p>Two different roles matter here, and they get different answers:</p>
        <ul>
          <li>
            <b>You, the operator.</b> The person signing in. We hold almost
            nothing about you — see sections 04 and 05.
          </li>
          <li>
            <b>Advertisers.</b> Businesses whose public advertising appears in
            the data set. The material we store about them is business
            information they published for the express purpose of being seen,
            and is described in section 03.
          </li>
        </ul>
      </section>

      <section>
        <h2>
          <span className="n">02</span>The short version
        </h2>
        <ul>
          <li>
            No sign-up, no newsletter, no analytics or advertising trackers, no
            third-party pixels of our own.
          </li>
          <li>
            One cookie, used only to keep you signed in. No consent banner is
            needed because nothing optional is set.
          </li>
          <li>
            Ad data comes from Meta&apos;s public Ad Library; the content
            belongs to the advertisers, not to us.
          </li>
          <li>
            No customer, order, payment or end-shopper data is collected, at any
            point, from anyone.
          </li>
        </ul>
      </section>

      <section>
        <h2>
          <span className="n">03</span>What we store
        </h2>
        <p>
          <b>Advertising data.</b> For each ad captured from Meta&apos;s Ad
          Library we store the ad&apos;s public identifier and detail URL, the
          advertiser&apos;s page name and numeric page identifier, the ad copy
          and link-card text, the creative image or video URL, the landing page
          URL and domain, the date the ad started running, its status, and a
          count of how many other ads reuse the same creative. This is what the
          product does; without it there is no product.
        </p>
        <p>
          <b>Store research data.</b> When you look up a store, we fetch that
          store&apos;s own public surfaces — its product listing, its theme
          name, the marketing pixels its pages load, and any contact address it
          publishes on its site — and store the result against the store&apos;s
          domain. The marketing pixels we record are named only (for example,{" "}
          <code>meta</code> or <code>klaviyo</code>); we never load them, and no
          tracking identifier belonging to anyone is captured.
        </p>
        <p>
          <b>Search trend data.</b> Aggregate interest figures for a search
          term, as published by Google Trends. These are normalised,
          audience-level numbers and contain no individual.
        </p>
        <p>
          <b>Your search terms and saved boards.</b> The keyword and country of
          each sweep you run, and the ads you save, so the interface can show
          you your own history and reuse cached results instead of re-fetching
          them.
        </p>
        <p>
          <b>Server logs.</b> Like any web server, the host records request
          metadata including IP address, user agent, path and timestamp. This is
          standard operational and security logging, not analytics, and it is
          not used to build a profile of you.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">04</span>What we do not collect
        </h2>
        <p>
          There is no account registration, so we hold no name, no email
          address, and no phone number for you. We do not process payments, so
          we never see card or bank details. We do not store your password: the
          single operator credential lives in the server&apos;s environment
          configuration, and a sign-in attempt is compared against it in memory
          and then discarded. We run no analytics product, no session recording,
          no advertising network and no social plugin of our own.
        </p>
        <p>
          We also do not collect consumer data from the stores we research — no
          shoppers, customers, orders or addresses. Where a store publishes a
          business contact address on its own website, that address may be
          recorded as part of the store profile; it is business contact
          information that the store chose to publish.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">05</span>Cookies and local storage
        </h2>
        <p>Exactly one cookie is set by this application:</p>
        <ul>
          <li>
            <code>advault_session</code> — a signed, <b>HttpOnly</b> token that
            records that you are signed in and when the session expires. It is
            set with <code>SameSite=Lax</code> and is marked <code>Secure</code>{" "}
            over HTTPS. It contains a username and two timestamps; it is not a
            tracking identifier and is not shared with anyone. It lasts up to
            seven days or until you sign out.
          </li>
        </ul>
        <p>
          Separately, your light/dark theme choice is saved in your
          browser&apos;s <code>localStorage</code> under the key{" "}
          <code>advault-theme</code>. That value never leaves your device and is
          not sent to the server.
        </p>
        <p>
          Because the only cookie is strictly necessary for the service you
          asked for, there is no analytics or marketing cookie to consent to,
          and so no consent banner is shown.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">06</span>Third-party services
        </h2>
        <p>
          Operating {LEGAL.product} necessarily involves other companies&apos;
          services, and each receives only what the relevant feature needs:
        </p>
        <ul>
          <li>
            <b>Meta Platforms</b> — the source of the advertising data, via the
            public Ad Library.
          </li>
          <li>
            <b>Google</b> — Trends for the demand figures, and Google Fonts for
            the typefaces. Requesting a web font discloses your IP address to
            Google.
          </li>
          <li>
            <b>Shopify</b> — when the product-import feature is used, the chosen
            product is written into your own store as a draft.
          </li>
          <li>
            <b>The hosting and database providers</b> running this deployment,
            which store the data described in section 03 on our behalf.
          </li>
        </ul>
        <p>
          We do not sell, rent, or trade any of this information, and we do not
          disclose it to anyone else except where the law compels us to — in
          which case we will disclose no more than we are required to.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">07</span>Why we use it
        </h2>
        <ul>
          <li>
            To provide the research features you are using — search, filtering,
            saving, exporting.
          </li>
          <li>
            To keep you signed in between visits, and to keep unauthorised
            visitors out.
          </li>
          <li>
            To keep the service running: debugging failures and detecting abuse.
          </li>
          <li>
            To avoid repeating a fetch we have already done, which is what the
            cache and the sweep log are for.
          </li>
        </ul>
        <p>
          We do not use any of it to train machine-learning models, to build
          advertising audiences, or for any purpose unrelated to running this
          tool.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">08</span>Legal bases (UK and EEA)
        </h2>
        <p>
          Where the UK GDPR or EU GDPR applies, we rely on{" "}
          <b>legitimate interests</b> for processing publicly available
          advertising and business information for market research, and on{" "}
          <b>performance of a contract</b> for the session cookie, which is
          necessary to provide the service you have requested. You may object to
          processing based on legitimate interests at any time using the contact
          details in section 12.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">09</span>How long we keep it
        </h2>
        <p>
          Ad and store research records are kept long term, because tracking
          whether an advertiser is scaling a creative only works if the history
          stays. Trend snapshots are kept per term and region. Sweep logs are
          kept so a later run does not refetch data we already have. Server logs
          are kept for a short operational window set by the host. Your session
          cookie expires automatically after seven days, or immediately when you
          sign out.
        </p>
        <p>
          Because the research data is a historical record, it may remain in
          place even if an advertiser later deactivates an ad. It reflects what
          was publicly visible on a given date.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">10</span>Security
        </h2>
        <p>
          Credentials are compared server-side, the session cookie is signed and{" "}
          <code>HttpOnly</code> so page scripts cannot read it, and the entire
          application and its API sit behind that session check so an
          unauthenticated request never reaches the data. Traffic is served over
          HTTPS. No system is perfect; if you believe you have found a
          vulnerability, please report it using the contact details below rather
          than testing it against data that is not yours.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">11</span>Your rights
        </h2>
        <p>
          Depending on where you live, you may have the right to access,
          correct, delete, restrict or object to our processing of your personal
          information, and to receive it in a portable form. Because we hold so
          little, most requests will resolve to &quot;we do not hold personal
          data about you&quot; — but ask, and we will confirm that in writing
          and explain what, if anything, does exist.
        </p>
        <p>
          <b>If you are an advertiser</b> and want your public advertising
          removed from this data set, write to the address below with the ad
          library identifier or the landing domain. We will action verifiable
          requests. Note that removing a record here does not remove it from
          Meta&apos;s Ad Library, which is the original public source — that
          requires a request to Meta.
        </p>
        <p>
          If you are in the UK or EEA and are unhappy with our response, you
          have the right to complain to your national data protection authority.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">12</span>Contact
        </h2>
        <p>
          Privacy questions, data requests and removal requests:{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>. We
          aim to respond within 30 days.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">13</span>Children
        </h2>
        <p>
          This is a business research tool and is not directed at children. We
          do not knowingly collect information from anyone under 16. If you
          believe a child has provided information to us, contact us and we will
          delete it.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">14</span>Where your data is processed
        </h2>
        <p>
          This deployment is operated from, and its database hosted in, the
          region configured by the operator. The third-party services listed in
          section 06 may process data in other countries, including the United
          States. Where personal data is transferred out of the UK or EEA, we
          rely on the appropriate safeguards those providers put in place, such
          as the UK Addendum or the EU Standard Contractual Clauses.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">15</span>Changes to this policy
        </h2>
        <p>
          If this policy changes in a way that affects what we collect or why,
          the date at the top of this page will be updated and the change noted
          in the repository history. Continuing to use {LEGAL.product} after a
          revision means you accept the revised policy. This document was last
          updated on {LEGAL.updated}.
        </p>
      </section>
    </LegalShell>
  );
}
