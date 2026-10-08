import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { MailPlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/pages/questions/page-header";

const TABS = [
  { value: "clienti", label: "Clienti" },
  { value: "posta", label: "Posta" },
] as const;

/** Newsletter section shell: header + Clienti / Posta tabs, each tab is its own route. */
export function NewsletterLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = pathname.startsWith("/newsletter/posta") ? "posta" : "clienti";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Newsletter"
        description="Iscritti dal form della landing e mail inviate."
        actions={
          <Button asChild>
            <Link to="/newsletter/posta/create">
              <MailPlusIcon />
              Crea una mail newsletter
            </Link>
          </Button>
        }
      />
      <Tabs value={current} onValueChange={(value) => navigate(`/newsletter/${value}`)}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Outlet />
    </div>
  );
}
