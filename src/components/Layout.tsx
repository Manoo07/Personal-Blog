import { Link, useLocation } from "react-router-dom";
import { ReactNode, useState } from "react";
import { Menu, X, Github, Linkedin } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/projects", label: "Projects" },
  { to: "/blog", label: "Blog" },
];

const socialLinks = [
  { href: "https://github.com/Manoo07", icon: Github, label: "GitHub" },
  { href: "https://www.linkedin.com/in/manohar-boinapally-81a131205/", icon: Linkedin, label: "LinkedIn" },
];

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/50 sticky top-0 z-50 backdrop-blur-md bg-background/80">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-12 flex items-center justify-between">
          <Link
            to="/"
            className="font-mono text-sm font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
            onClick={closeMobileMenu}
          >
            ~/dev
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm transition-colors ${
                  location.pathname === link.to || (link.to !== "/" && location.pathname.startsWith(link.to))
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Social Links */}
            <div className="flex items-center gap-3 ml-2 pl-3 border-l border-border/50">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-secondary/50 rounded-md"
                    aria-label={social.label}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle navigation"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </nav>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={closeMobileMenu}
                  className={`block py-2 px-3 rounded-md text-sm transition-colors ${
                    location.pathname === link.to || (link.to !== "/" && location.pathname.startsWith(link.to))
                      ? "text-primary font-medium bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* Mobile Social Links */}
              <div className="pt-2 mt-3 border-t border-border/50">
                <div className="flex items-center gap-4">
                  {socialLinks.map((social) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={social.href}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={closeMobileMenu}
                        className="flex items-center gap-2 py-2 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                      >
                        <Icon className="w-4 h-4" />
                        <span>{social.label}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/50 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Built with curiosity and too much coffee.
          </p>
          <div className="flex items-center gap-4 sm:gap-5">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">LinkedIn</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
