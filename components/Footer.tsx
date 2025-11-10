import Link from "next/link";
import { Github } from "lucide-react";
import { APP_CONFIG } from "@/lib/config/app";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-6 p-4 border-t border-dark-300">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-4 text-light-300 text-sm">
          <p>© {currentYear} PYTAI. All rights reserved.</p>
          <div className="flex gap-4">
            <a 
              href={APP_CONFIG.getLandingUrl(APP_CONFIG.routes.features)}
              className="hover:text-primary-100 transition-colors"
            >
              Features
            </a>
            <a 
              href={APP_CONFIG.getLandingUrl(APP_CONFIG.routes.pricing)}
              className="hover:text-primary-100 transition-colors"
            >
              Pricing
            </a>
            <a 
              href={APP_CONFIG.getLandingUrl()}
              className="hover:text-primary-100 transition-colors"
            >
              About
            </a>
          </div>
        </div>
        
        <Link 
          href="https://github.com/getFrontend" 
          target="_blank"
          rel="noopener noreferrer"
          className="text-light-300 hover:text-primary-100 transition-colors"
          aria-label="GitHub Repository"
        >
          <Github size={24} />
        </Link>
      </div>
    </footer>
  );
};

export default Footer;