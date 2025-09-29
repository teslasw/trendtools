"use client";

import Link from "next/link";
import { MapPin, Phone, Mail, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="w-full backdrop-blur-sm ">
      <div className="max-w-7xl mx-auto px-14 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Logo and Contact */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <Logo width={140} height={32} />
            </div>
            
            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <a href="tel:1300386159" className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors">
                <Phone className="w-4 h-4 mr-2" />
                1300 386 159
              </a>
              <a href="mailto:admin@trendadvisory.com.au" className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors">
                <Mail className="w-4 h-4 mr-2" />
                admin@trendadvisory.com.au
              </a>
            </div>
            
            {/* Social Media */}
            <div className="flex space-x-3">
              <a
                href="https://www.facebook.com/trendadvisory"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-gray-300/30 dark:border-gray-600/30 flex items-center justify-center text-gray-700 dark:text-gray-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:hover:bg-emerald-500 dark:hover:border-emerald-500 transition-all"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/trendadvisory"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-gray-300/30 dark:border-gray-600/30 flex items-center justify-center text-gray-700 dark:text-gray-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:hover:bg-emerald-500 dark:hover:border-emerald-500 transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/company/trendadvisory"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-gray-300/30 dark:border-gray-600/30 flex items-center justify-center text-gray-700 dark:text-gray-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:hover:bg-emerald-500 dark:hover:border-emerald-500 transition-all"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com/trendadvisory"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-gray-300/30 dark:border-gray-600/30 flex items-center justify-center text-gray-700 dark:text-gray-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:hover:bg-emerald-500 dark:hover:border-emerald-500 transition-all"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://www.yelp.com/biz/trend-advisory"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-gray-300/30 dark:border-gray-600/30 flex items-center justify-center text-gray-700 dark:text-gray-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:hover:bg-emerald-500 dark:hover:border-emerald-500 transition-all"
                aria-label="Yelp"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.48 3.5C11.48 2.12 10.36 1 8.98 1C8.07 1 7.26 1.44 6.76 2.12C6.44 2.54 5.5 4.06 4.62 5.84C3.72 7.64 2.93 9.21 2.5 10.08C2.12 10.83 1.92 11.66 1.92 12.5C1.92 13.88 2.56 15.12 3.58 15.91C4.29 16.46 5.16 16.77 6.08 16.77C6.36 16.77 6.64 16.74 6.91 16.68L8.26 16.37C9.32 16.12 10.17 15.35 10.55 14.35C10.73 13.88 10.82 13.37 10.82 12.85V4.15C10.82 3.74 11.15 3.41 11.56 3.41L11.48 3.5ZM11.48 18.5V21.5C11.48 22.88 12.6 24 13.98 24C15.36 24 16.48 22.88 16.48 21.5V18.5C16.48 17.12 15.36 16 13.98 16C12.6 16 11.48 17.12 11.48 18.5ZM18.48 8.5V11.5C18.48 12.88 19.6 14 20.98 14C22.36 14 23.48 12.88 23.48 11.5V8.5C23.48 7.12 22.36 6 20.98 6C19.6 6 18.48 7.12 18.48 8.5Z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Locations */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-manrope font-semibold tracking-tight mb-6 text-gray-900 dark:text-gray-100">
              Locations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Brisbane Office */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Brisbane</h4>
                <address className="text-sm text-gray-600 dark:text-gray-400 not-italic">
                  3/99 Racecourse Road<br />
                  Ascot, QLD, 4007
                </address>
                <a
                  href="https://maps.google.com/?q=3/99+Racecourse+Road+Ascot+QLD+4007"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                >
                  <MapPin className="w-4 h-4 mr-1" />
                  Get Directions
                </a>
              </div>

              {/* Gold Coast Office */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Gold Coast</h4>
                <address className="text-sm text-gray-600 dark:text-gray-400 not-italic">
                  Level 2, 4 Railway Street<br />
                  Southport, QLD, 4215
                </address>
                <a
                  href="https://maps.google.com/?q=Level+2+4+Railway+Street+Southport+QLD+4215"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                >
                  <MapPin className="w-4 h-4 mr-1" />
                  Get Directions
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Information */}
        <div className="pt-8 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Trend Advisory Pty Ltd ACN 680 920 987 is a Corporate Authorised Representative CAR# 1312087 of Trend Investor Services Proprietary Limited TA Trend Capital Group ACN 061 768 670 | AFSL #255475{" "}
            <Link href="/financial-services-guide" className="underline hover:text-gray-700 dark:hover:text-gray-300">
              FINANCIAL SERVICES GUIDE
            </Link>
            . Trend Advisory is also a Credit Representative #563488 on behalf of Credit Partners Australia, Australian Credit License #497229
          </p>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Trend Advisory does not provide legal or tax advice. As a credit representative, we are authorised to provide credit assistance; however, we do not hold an Australian Credit License directly. Any referrals to third-party tax accountants or legal professionals are made solely for your convenience. We do not endorse, guarantee, or take responsibility for the services or products provided by these third parties. You are encouraged to seek independent legal and tax advice before making any decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}