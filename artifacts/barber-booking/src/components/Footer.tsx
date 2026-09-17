import { Link } from "wouter";
import BrandMark from "@/components/BrandMark";

const links = {
  product: [
    { label: "Home", href: "/" },
    { label: "Pricing", href: "/pricing" },
    { label: "About Us", href: "/about" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Refund Policy", href: "/refund" },
  ],
  support: [
    { label: "Contact Us", href: "/contact" },
  ],
};

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-[#f7f2eb] uppercase tracking-widest mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-[#24201d] text-[#cfc4ba] mt-auto">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/">
              <BrandMark tone="paper" />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-[#a1968d] max-w-[240px]">
              Skip the wait. Find local barbershops, book your slot, and walk right in.
            </p>
          </div>

          {/* Product */}
          <Column title="Product">
            <ul className="space-y-2.5">
              {links.product.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:text-[#E8900C] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Column>

          {/* Legal */}
          <Column title="Legal">
            <ul className="space-y-2.5">
              {links.legal.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:text-[#E8900C] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Column>

          {/* Support */}
          <Column title="Support">
            <ul className="space-y-2.5">
              {links.support.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:text-[#E8900C] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href="mailto:trustenai.in@gmail.com" className="text-sm hover:text-[#E8900C] transition-colors">
                  trustenai.in@gmail.com
                </a>
              </li>
            </ul>
          </Column>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-[#403a35] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-[#756b62]">© {new Date().getFullYear()} eNai. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-xs text-[#756b62] hover:text-[#a1968d] transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-[#756b62] hover:text-[#a1968d] transition-colors">Terms</Link>
            <Link href="/refund" className="text-xs text-[#756b62] hover:text-[#a1968d] transition-colors">Refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
