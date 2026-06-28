import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy',
  description: 'How Brier collects, uses, and processes personal data across the Brier website and services.',
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-white font-sans font-extrabold tracking-tight text-[22px] mt-12 mb-3">{children}</h2>
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] leading-relaxed text-[#9a9a9a] mb-4">{children}</p>
}
function LI({ children }: { children: React.ReactNode }) {
  return <li className="text-[14px] leading-relaxed text-[#9a9a9a] mb-2">{children}</li>
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-white">
      <div className="max-w-[760px] mx-auto px-6 md:px-10 py-16">
        <Link href="/" className="no-underline inline-flex items-baseline gap-2 mb-10">
          <span className="font-sans font-extrabold text-[18px] tracking-[-0.04em]">Brier<span className="text-primary">.</span></span>
        </Link>

        <h1 className="m-0 font-sans font-extrabold tracking-[-0.04em] text-[clamp(30px,5vw,46px)]">Privacy Policy</h1>
        <p className="mt-3 font-mono text-[12px] text-[#666]">Last revised on June 19, 2026</p>

        <div className="mt-4 border border-[#1a1a1a] bg-[#0a0a0a] p-4 text-[12px] leading-relaxed text-[#777] font-mono">
          Draft template for Brier. Your legal counsel should confirm the operating entity, governing
          jurisdiction, and contact email before relying on this document in production.
        </div>

        <P>
          This Privacy Policy (the &quot;Policy&quot;) describes how Brier (the &quot;Organization&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;)
          processes personal data we may collect from users of the Brier website, https://brier.world, including any
          of its subdomains (the &quot;Website&quot;), and any tools, services, features, and functionality available through
          the Website (collectively, the &quot;Services&quot;). For the purposes of this Policy, &quot;you&quot; and &quot;your&quot; refers to
          you as the user of the Services.
        </P>
        <P>
          Read this Policy carefully so you understand your rights and how we collect, use, and process your personal
          data. If you do not agree to this Policy, do not use, access, connect to, or interact with the Services.
        </P>

        <H2>Personal data we collect</H2>
        <P><span className="text-white">Information you provide to us.</span> Personal data may include your internet protocol address (IP address), any digital asset, smart contract, or wallet address, associations, and identifiers, and geolocation data. It may also include your social media handle, transaction history associated with a linked wallet, token holdings, and any information you submit when you contact us.</P>
        <P><span className="text-white">Information we collect automatically.</span> When you visit the Website our servers may log the IP address of the requesting device, the date and time of access, the country of access, any API endpoint, user agent details, your operating system and browser, and the transmission protocol used.</P>
        <P><span className="text-white">Information from third party wallets.</span> Certain actions require you to connect a compatible third party wallet. Your use of such wallets is governed by the wallet provider&apos;s own privacy policy. Wallets are not maintained, supported by, or affiliated with the Organization, and we disclaim liability for actions arising from your use of third party wallets.</P>

        <H2>Why we process it</H2>
        <P>We process this information to provide the Services and perform our contract with you, to verify eligibility and prevent prohibited use, to maintain the security and stability of the Services, to conduct troubleshooting and analytics, and to comply with applicable legal obligations. With your consent, we may use usage data to tailor features and content and, where you opt in, for marketing.</P>

        <H2>Your rights</H2>
        <P>Depending on where you live, you may have rights in relation to your personal data, including:</P>
        <ul className="list-disc pl-5 mb-4">
          <LI>Access to the personal data we hold and how we use it</LI>
          <LI>Correction of inaccurate personal data</LI>
          <LI>Deletion of your personal data, in certain circumstances</LI>
          <LI>Objection to or restriction of processing, in certain circumstances</LI>
          <LI>Portability of your personal data</LI>
          <LI>Objection to marketing communications at any time</LI>
          <LI>Withdrawal of consent, where we rely on consent</LI>
        </ul>
        <P>Some of these rights apply only in certain circumstances and may be limited by law. To exercise a right, contact us at the email below. We will use reasonable means to verify your identity before responding.</P>

        <H2>Sharing of personal data</H2>
        <P>We may share your information with service providers and vendors who process data on our behalf (such as analytics, screening, and infrastructure providers), with professional advisors, with law enforcement and regulatory authorities where required by law, with our affiliates, and in connection with a merger, sale, or other business transaction. Your information may be transferred to and processed in countries outside the jurisdiction in which you reside, with appropriate safeguards where required.</P>

        <H2>Retention</H2>
        <P>We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected, including to satisfy legal, accounting, or reporting requirements, after which we expect to delete it.</P>

        <H2>Children</H2>
        <P>Persons under eighteen (18) are not permitted to use the Services, and we do not knowingly collect personal data from children. If we learn we have collected information from a person under eighteen, we will make reasonable efforts to delete it.</P>

        <H2>Security</H2>
        <P>Despite our efforts, we cannot guarantee perfect security of information transmitted through the Website. Any transmission is at your own risk.</P>

        <H2>Third party links</H2>
        <P>The Website may link to websites or platforms operated by third parties, including social media platforms. We do not own or control those sites and are not responsible for their privacy practices or content. Review their policies before using them.</P>

        <H2>Updates</H2>
        <P>We may update this Policy from time to time. Updates apply only to information collected after the change. If we make material changes, we will update the &quot;Last revised&quot; date above.</P>

        <H2>Contact</H2>
        <P>If you have questions about this Policy or our data practices, contact us at notices@brier.world.</P>

        <div className="mt-14 border-t border-[#111] pt-6 flex gap-6 font-mono text-[11px] text-[#444]">
          <Link href="/" className="hover:text-[#888] no-underline transition-colors">HOME</Link>
          <Link href="/terms" className="hover:text-[#888] no-underline transition-colors">TERMS OF SERVICE</Link>
        </div>
      </div>
    </div>
  )
}
