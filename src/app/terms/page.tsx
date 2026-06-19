import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your access to and use of the Brier website and services.',
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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-white">
      <div className="max-w-[760px] mx-auto px-6 md:px-10 py-16">
        <Link href="/" className="no-underline inline-flex items-baseline gap-2 mb-10">
          <span className="font-sans font-extrabold text-[18px] tracking-[-0.04em]">Brier<span className="text-primary">.</span></span>
        </Link>

        <h1 className="m-0 font-sans font-extrabold tracking-[-0.04em] text-[clamp(30px,5vw,46px)]">Terms of Service</h1>
        <p className="mt-3 font-mono text-[12px] text-[#666]">Last revised on June 19, 2026</p>

        <div className="mt-4 border border-[#1a1a1a] bg-[#0a0a0a] p-4 text-[12px] leading-relaxed text-[#777] font-mono">
          Draft template for Brier. Your legal counsel should confirm the operating entity, governing
          jurisdiction, dispute resolution venue, and contact email before relying on this document in production.
        </div>

        <P>
          Welcome to the Terms of Service (these &quot;Terms&quot;) for the Brier website, https://brier.world, including its
          subdomains (the &quot;Website&quot;), operated by or on behalf of Brier (the &quot;Organization&quot;, &quot;we&quot;, or &quot;us&quot;). The
          Website and any content, tools, software, documentation, features, and functionality offered through it are
          collectively the &quot;Services&quot;.
        </P>
        <P>
          These Terms govern your access to and use of the Services. By accessing or using the Services, you agree to
          these Terms. If you do not understand or agree to these Terms, you may not use the Services. &quot;You&quot; and &quot;your&quot;
          means you as the user of the Services, and any entity you represent.
        </P>

        <H2>1. Who may use the Services</H2>
        <P>You must be 18 years of age or older and not be a Prohibited Person to use the Services. A &quot;Prohibited Person&quot; is any person or entity that is the subject of economic or trade sanctions, located in or a resident of a sanctioned jurisdiction, or otherwise barred from using the Services under applicable law. You are solely responsible for complying with the laws of the jurisdiction from which you access the Services.</P>

        <H2>2. The Brier protocol</H2>
        <P>The Brier protocol is a set of smart contracts and an off chain indexer that score prediction algorithms and operate non custodial vaults. The protocol is not part of the Services, and we make no representations or warranties with respect to it. Certain elements may be made available under open source or source available licenses, and these Terms do not override those licenses. The disclaimers and limitations in Section 6 apply to your use of the protocol.</P>

        <H2>3. Rights we grant you</H2>
        <P>We grant you a limited, revocable, non transferable, non sublicensable right to access and use the Services for your own use, provided you comply with these Terms. Access may be interrupted at any time for maintenance, updates, or other reasons, and we have no liability arising from any inability to access the Services.</P>
        <P>You shall not, among other things: copy, distribute, or create derivative works from the Services except as permitted; remove proprietary notices; use bots or unauthorized software to access or modify the Services; overburden or disrupt the Services; attempt unauthorized access; scrape or harvest data; introduce malicious code; impersonate others; or violate any applicable law in connection with the Services.</P>

        <H2>4. Ownership and content</H2>
        <P>The Services, including their look and feel, content, and materials, are protected by intellectual property laws. The Organization and its licensors own all right, title, and interest in the Services. Any feedback you provide becomes the property of the Organization, and you assign to us any rights you may have in such feedback.</P>

        <H2>5. Third party services and materials</H2>
        <P>The Services may link to or make available services, content, or materials from third parties. These are provided as a convenience and we do not endorse them. Your use of third party services is governed solely by their terms, and we are not responsible for them.</P>

        <H2>6. Disclaimers and limitation of liability</H2>
        <P>Your access to and use of the Services and the Brier protocol is entirely at your own risk. The Services are provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of any kind, whether express, implied, or statutory, including warranties of merchantability, fitness for a particular purpose, and non infringement.</P>
        <P>To the extent not prohibited by law, the Organization and its affiliates, officers, directors, agents, and licensors will not be liable for any indirect, special, incidental, consequential, or punitive damages, or any loss of profits or data, arising out of or related to your use of or inability to use the Services. Prediction markets are volatile, vaults are not loss proof, and a circuit breaker caps drawdown but does not make losses impossible. Never deposit what you cannot afford to lose.</P>

        <H2>7. Assumption of risk</H2>
        <P>By using the Services you represent that you understand the risks of blockchain technology and digital assets, including loss of private keys, smart contract vulnerabilities, market volatility, regulatory uncertainty, and the risk that assets may have little or no value. You bear these risks.</P>

        <H2>8. Indemnification</H2>
        <P>You agree to indemnify and hold the Organization and its affiliates harmless from any claims, costs, damages, losses, and expenses arising out of your breach of these Terms or applicable law, your violation of the rights of a third party, your use or misuse of the Services, or your negligence or willful misconduct.</P>

        <H2>9. Dispute resolution</H2>
        <P>You and the Organization agree to first attempt to resolve any dispute informally. Any remaining dispute will be resolved through binding individual arbitration, and you waive the right to participate in class actions or representative proceedings, except where prohibited by applicable law. The specific arbitration rules, venue, and governing law will be set out by the Organization and confirmed by legal counsel.</P>

        <H2>10. General</H2>
        <ul className="list-disc pl-5 mb-4">
          <LI>We may update these Terms from time to time and will update the &quot;Last revised&quot; date above.</LI>
          <LI>We may suspend or terminate your access for any reason, including breach of these Terms.</LI>
          <LI>If any provision is unenforceable, the remaining provisions stay in effect.</LI>
          <LI>These Terms are governed by the laws of the applicable jurisdiction, to be confirmed by the Organization.</LI>
        </ul>

        <H2>Contact</H2>
        <P>Questions about these Terms can be sent to notices@brier.world.</P>

        <div className="mt-14 border-t border-[#111] pt-6 flex gap-6 font-mono text-[11px] text-[#444]">
          <Link href="/" className="hover:text-[#888] no-underline transition-colors">HOME</Link>
          <Link href="/privacy" className="hover:text-[#888] no-underline transition-colors">PRIVACY POLICY</Link>
        </div>
      </div>
    </div>
  )
}
