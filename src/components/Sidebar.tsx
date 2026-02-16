import {
  LayoutDashboard,
  Settings,
  HelpCircle,
  Radar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BookOpen,
  History,
  Clock,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysis } from "@/hooks/useAnalysis";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

interface SubMenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Brand Radar", path: "/" },
  { icon: Settings, label: "Settings", path: "/settings" },
  {
    icon: HelpCircle, label: "Help", path: "/help", subItems: [
      { icon: BookOpen, label: "Methodology", path: "/methodology" },
    ]
  },
];

export function Sidebar() {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { user, signOut } = useAuth();
  const { searchHistory, loadFromHistory } = useAnalysis();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  const handleNavClick = (item: typeof menuItems[0]) => {
    navigate(item.path);
  };

  const handleHistoryClick = (id: string) => {
    loadFromHistory(id);
    navigate("/");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <aside className={cn(
      "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
      isMobile ? "w-14" : collapsed ? "w-16" : "w-64"
    )}>
      <div className={cn(
        "border-b border-border p-3 flex items-center",
        isMobile ? "justify-center" : "justify-between"
      )}>
        <div
          onClick={() => navigate('/')}
          className={cn(
            "flex cursor-pointer items-center hover:opacity-80 transition-opacity",
            collapsed ? "justify-center" : "gap-2"
          )}
        >
          <div className="bg-primary/20 p-1.5 rounded-lg">
            <Radar className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && <span className="font-bold text-foreground">Home</span>}
        </div>
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-hidden flex flex-col">
        {menuItems.map((item) => {
          const isActive = item.path === location.pathname;
          const hasSubItems = 'subItems' in item && item.subItems;
          const isSubItemActive = hasSubItems && item.subItems?.some(sub => sub.path === location.pathname);

          return (
            <div key={item.label}>
              <button
                onClick={() => handleNavClick(item)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  collapsed && "justify-center px-2",
                  (isActive || isSubItemActive)
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
              </button>
              {hasSubItems && !collapsed && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.subItems?.map((subItem) => {
                    const isSubActive = subItem.path === location.pathname;
                    return (
                      <button
                        key={subItem.label}
                        onClick={() => navigate(subItem.path)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                          isSubActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <subItem.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium">{subItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Recent Searches Section */}
        {!collapsed && searchHistory.length > 0 && (
          <div className="pt-4 flex-1 min-h-0">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              <History className="w-3 h-3" />
              Saved Searches
              <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", showHistory && "rotate-90")} />
            </button>
            {showHistory && (
              <ScrollArea className="h-32 mt-1">
                <div className="space-y-1 pr-2">
                  {searchHistory.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleHistoryClick(item.id)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors group"
                    >
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                        {item.companyName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.analysedAt)}
                        <span className="ml-auto font-medium">{item.overallScore}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-border">
        {!collapsed && user && (
          <div className="mb-3 px-3">
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={signOut}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            !collapsed && "w-full justify-start"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>

      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="glass-card rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-2">Pro Tip</p>
            <p className="text-xs text-foreground">
              Your searches are saved locally. Click on any recent search to reload it.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
