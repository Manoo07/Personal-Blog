import { Link, useLocation } from "react-router-dom";
import { ReactNode, useState } from "react";
import { Menu, X, LogOut, KeyRound, BarChart2 } from "lucide-react";
import SocialIcon from "@/components/SocialIcon";
import { useSiteConfig } from "@/hooks/use-site-config";
import { safeHref } from "@/lib/site-config";
import { useUserAuth } from "@/contexts/UserAuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: ReactNode;
  /** Hide the site footer (used by full-height, pane-based pages like a blog post). */
  hideFooter?: boolean;
}

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/projects", label: "Projects" },
  { to: "/blog", label: "Blog" },
];



const Layout = ({ children, hideFooter = false }: LayoutProps) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentUser, isLoggedIn, openAuthModal, logout } = useUserAuth();
  const config = useSiteConfig();
  const links = config.links.filter((l) => safeHref(l.url));
  const headerLinks = links.filter((l) => l.showInHeader);
  const external = (url: string) => (url.startsWith("mailto:") ? {} : { target: "_blank", rel: "noopener noreferrer" });

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border sticky top-0 z-50 bg-secondary">
        <nav className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 h-12 flex items-center justify-between">
          <Link
            to="/"
            className="font-mono text-sm font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
            onClick={closeMobileMenu}
          >
            {config.site.logoText}
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-6">
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
            </div>

            <div className="flex items-center gap-3 pl-3 border-l border-border/50">
              {headerLinks.map((social) => (
                <a
                  key={social.url}
                  href={safeHref(social.url)}
                  {...external(social.url)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-secondary/50 rounded-md"
                  aria-label={social.label}
                  title={social.label}
                >
                  <SocialIcon kind={social.kind} className="w-4 h-4" />
                </a>
              ))}

              {/* User auth */}
              {isLoggedIn && currentUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="w-7 h-7 rounded-full bg-primary/20 text-primary text-[11px] font-semibold flex items-center justify-center hover:bg-primary/30 transition-colors"
                      aria-label="Account menu"
                    >
                      {currentUser.username.slice(0, 2).toUpperCase()}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-medium truncate">{currentUser.username}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{currentUser.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <BarChart2 className="w-3.5 h-3.5" />
                        My Progress
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openAuthModal("change-password")}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Change Password
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={logout}
                      className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  onClick={() => openAuthModal("login")}
                  className="text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:border-border rounded-md px-2.5 py-1 transition-colors"
                >
                  Sign In
                </button>
              )}
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
                <div className="flex items-center justify-between gap-4">
                  {headerLinks.map((social) => (
                    <a
                      key={social.url}
                      href={safeHref(social.url)}
                      {...external(social.url)}
                      onClick={closeMobileMenu}
                      className="flex items-center gap-2 py-2 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    >
                      <SocialIcon kind={social.kind} className="w-4 h-4" />
                      <span>{social.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Mobile user auth */}
              <div className="pt-2 border-t border-border/50">
                {isLoggedIn && currentUser ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1.5">
                      <p className="text-xs font-medium">{currentUser.username}</p>
                      <p className="text-[11px] text-muted-foreground">{currentUser.email}</p>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-2 py-2 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    >
                      <BarChart2 className="w-4 h-4" /> My Progress
                    </Link>
                    <button
                      onClick={() => { closeMobileMenu(); openAuthModal("change-password"); }}
                      className="w-full flex items-center gap-2 py-2 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    >
                      <KeyRound className="w-4 h-4" /> Change Password
                    </button>
                    <button
                      onClick={() => { closeMobileMenu(); logout(); }}
                      className="w-full flex items-center gap-2 py-2 px-3 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { closeMobileMenu(); openAuthModal("login"); }}
                    className="w-full py-2 px-3 rounded-md text-sm text-left text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {!hideFooter && (
      <footer className="border-t border-border/50 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            {config.site.footerTagline}
          </p>
          <div className="flex items-center gap-4 sm:gap-5">
            {links.map((l) => (
              <a
                key={l.url}
                href={safeHref(l.url)}
                {...external(l.url)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
      )}
    </div>
  );
};

export default Layout;
