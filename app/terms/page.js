import { LegalShell, LEGAL } from "../legal";

export const metadata = {
  title: "Terms & Conditions · TheWinningLoop",
  description:
    "The terms governing use of the TheWinningLoop advertising-research tool.",
};

export default function TermsAndConditions() {
  return (
    <LegalShell
      icon="document"
      title="Terms &amp; Conditions"
      intro={`These terms govern your use of ${LEGAL.product}, an advertising-research tool that reads publicly available advertising data. By signing in or using the software you agree to them. If you do not agree, do not use the service.`}
    >
      <section>
        <h2>
          <span className="n">01</span>The agreement
        </h2>
        <p>
          This is a binding agreement between you and the operator of{" "}
          {LEGAL.product} (&quot;we&quot;, &quot;us&quot;). It applies to the
          application, its API, and any exported files it produces. Our{" "}
          <a href="/privacy">Privacy Policy</a> forms part of these terms by
          reference.
        </p>
        <p>
          You confirm that you are at least 18 years old and that you have the
          authority to accept these terms on behalf of yourself or, if you are
          using {LEGAL.product} for an organisation, that organisation.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">02</span>What {LEGAL.product} is
        </h2>
        <p>
          {LEGAL.product} is a research tool. It collects advertising that is
          already publicly visible on Meta&apos;s Ad Library, along with
          publicly published information about the stores that advertising
          points to, and presents it for market analysis — search, filtering,
          comparison, saving, and export.
        </p>
        <p>
          It is an information product, not an advertising platform. It does not
          place ads, and it is not affiliated with, endorsed by, or sponsored by
          Meta, Google, TikTok, Pinterest, Shopify or any other platform whose
          public data it reads.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">03</span>Access and your credentials
        </h2>
        <p>
          Access is by a single operator credential configured on the server.
          That credential is personal to you and you must keep it confidential.
          You are responsible for everything done with your session, including
          activity by anyone you share access with.
        </p>
        <p>
          Do not share the credential publicly, commit it to a repository, or
          embed it in a client-side application. Tell us immediately if you
          believe it has been exposed, and change it — doing so invalidates
          every existing session, which is the intended effect.
        </p>
        <p>
          We may suspend or revoke access without notice if we reasonably
          believe these terms have been breached, or if continuing to serve a
          request would put us in conflict with a third party&apos;s terms or
          the law.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">04</span>Acceptable use
        </h2>
        <p>You agree that you will not:</p>
        <ul>
          <li>
            use {LEGAL.product} for anything unlawful, or in breach of any
            platform&apos;s terms of service;
          </li>
          <li>
            resell, sublicense, or redistribute the data set, in bulk or as a
            competing product or API, without our written permission;
          </li>
          <li>
            circumvent any technical measure, rate limit, authentication control
            or access restriction on this service or on any third-party source
            it reads;
          </li>
          <li>
            scrape or overload the service, or use it to send automated traffic
            that is disproportionate to normal interactive use;
          </li>
          <li>
            attempt to access data belonging to other users, to gain access
            beyond the session you were granted, or to probe the service for
            vulnerabilities;
          </li>
          <li>
            use the output to harass, defame, or unlawfully target any
            advertiser or individual, or to make automated decisions that
            produce legal effects about a person;
          </li>
          <li>
            use the service to build or train a machine-learning model, or to
            compile a data set for resale.
          </li>
        </ul>
        <p>
          You are also responsible for complying with the terms of the platforms
          whose public data you research, and with any law that applies to your
          use of it — including advertising, consumer-protection, and
          data-protection law in the jurisdictions you operate in.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">05</span>Third-party data and trademarks
        </h2>
        <p>
          Advertising copy, images, videos, brand names, logos and store
          information in this data set belong to their respective owners and are
          shown here because they were published publicly. Nothing in these
          terms grants you any right in that material, and nothing here
          transfers ownership of it to us or to you. If you reproduce an
          advertiser&apos;s creative outside this tool, you are responsible for
          having the right to do so.
        </p>
        <p>
          Facebook, Meta, Instagram, Google, YouTube, TikTok, Pinterest and
          Shopify are trademarks of their respective owners. They are named here
          to identify the sources and features this tool works with,
          descriptively. No endorsement, partnership or affiliation is implied.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">06</span>Accuracy — the service is provided
          &quot;as is&quot;
        </h2>
        <p>
          The data is collected by automated means from public pages that change
          without notice. It is provided <b>as is</b>, without warranty of any
          kind, express or implied, including as to accuracy, completeness,
          timeliness, or fitness for a particular purpose.
        </p>
        <p>Be specific about what that means, because it is not boilerplate:</p>
        <ul>
          <li>
            Some fields are known to be sparsely populated — call-to-action text
            and platform flags in particular — because the public page does not
            expose them reliably.
          </li>
          <li>
            Derived figures are estimates. The ad score, for example, is a
            synthetic signal computed from creative reuse, run length and
            advertiser scale, because the Ad Library publishes no engagement
            data. It is not a measurement.
          </li>
          <li>
            Run dates reflect what the source page stated on the date we read
            it, not a live value; an ad shown as active may have been paused
            since.
          </li>
          <li>
            A sweep that finds nothing may mean there is nothing, or may mean
            the source refused the fetch. Absence of evidence here is not
            evidence of absence.
          </li>
        </ul>
        <p>
          Do not rely on this tool as the sole basis for a decision with legal,
          financial or commercial consequences. Verify anything material against
          the original source.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">07</span>Intellectual property
        </h2>
        <p>
          The software, interface, and design of {LEGAL.product} belong to the
          operator. The research data set is made available to you for your own
          internal research use, under the restrictions in section 04.
          Third-party material remains with its owners, as set out in section
          05.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">08</span>Fees
        </h2>
        <p>
          The service is currently provided at no charge for internal use. We
          may introduce fees or usage limits in future; where we do, we will
          give reasonable notice, and you may stop using the service if you do
          not accept them. No payment obligation exists today, and we hold no
          payment details for anyone.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">09</span>Availability and changes
        </h2>
        <p>
          The service depends on third-party public pages and APIs that we do
          not control. They change, rate-limit, and block access without
          warning, and several features are documented as unavailable for
          exactly that reason. We do not guarantee that any feature will
          continue to work, or that the service will be available at any
          particular time. We may modify, suspend or discontinue any part of it,
          and we are not liable for outages or lost data.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">10</span>Limitation of liability
        </h2>
        <p>
          To the fullest extent permitted by law, we are not liable for any
          indirect, incidental, special, consequential or punitive damages, or
          for any loss of profit, revenue, opportunity, goodwill or data,
          arising out of or in connection with your use of {LEGAL.product} —
          whether the claim is in contract, tort (including negligence), statute
          or otherwise, and even if we were advised of the possibility of such
          loss.
        </p>
        <p>
          Where liability cannot be excluded, our total aggregate liability is
          limited to the greater of the amount you paid us in the twelve months
          before the claim (which, at present, is zero) or USD 100. Nothing in
          these terms limits liability that cannot lawfully be limited,
          including for death or personal injury caused by negligence, or for
          fraud.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">11</span>Indemnity
        </h2>
        <p>
          You agree to indemnify and hold us harmless against any claim, loss,
          liability or expense (including reasonable legal fees) arising from
          your use of {LEGAL.product} in breach of these terms — in particular
          from your reproduction of third-party advertising material, or from
          your use of the research data in a way that infringes someone
          else&apos;s rights.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">12</span>Termination
        </h2>
        <p>
          You may stop using the service at any time; signing out ends your
          session immediately. We may suspend or terminate access if these terms
          are breached, or if we discontinue the service. Sections 05, 06, 07,
          10, 11 and 13 survive termination, because their subject matter
          outlives the arrangement.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">13</span>Governing law
        </h2>
        <p>
          These terms are governed by the laws of {LEGAL.jurisdiction}, without
          regard to its conflict-of-law rules. The courts of that jurisdiction
          have exclusive jurisdiction over any dispute arising from these terms
          or the service, and both parties submit to it.
        </p>
        <p>
          Before starting proceedings, please raise the issue with us directly —
          most problems are a configuration or a data-source issue and are
          quicker to fix than to litigate.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">14</span>Changes to these terms
        </h2>
        <p>
          We may revise these terms. When we do, the &quot;last updated&quot;
          date at the top of this page changes, and material revisions will be
          noted in the repository history. Continuing to use {LEGAL.product}{" "}
          after a revision means you accept the revised terms. If any provision
          is held unenforceable, the rest remains in force. These terms were
          last updated on {LEGAL.updated}.
        </p>
      </section>

      <section>
        <h2>
          <span className="n">15</span>Contact
        </h2>
        <p>
          Questions about these terms, access requests, and notices:{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </section>
    </LegalShell>
  );
}
