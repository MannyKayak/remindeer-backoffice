import { Refine, Authenticated } from "@refinedev/core";
import routerProvider, {
  CatchAllNavigate,
  UnsavedChangesNotifier,
  DocumentTitleHandler,
} from "@refinedev/react-router";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router";

import { refineDataProvider } from "@/providers/data-provider";
import { authProvider } from "@/providers/auth-provider";
import { AppLayout } from "@/layout/app-layout";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { QuestionCreatePage, QuestionEditPage, QuestionListPage } from "@/pages/questions";
import {
  NewsletterCreatePage,
  NewsletterEditPage,
  NewsletterLayout,
  NewsletterListPage,
  NewsletterShowPage,
  SubscriberListPage,
} from "@/pages/newsletter";
import { HomePageContentPage } from "@/pages/page-contents";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
      <Refine
        dataProvider={refineDataProvider}
        authProvider={authProvider}
        routerProvider={routerProvider}
        resources={[
          {
            name: "questions",
            list: "/questions",
            create: "/questions/create",
            edit: "/questions/edit/:id",
            meta: { label: "Domande" },
          },
          {
            name: "email_signups",
            list: "/newsletter/clienti",
            meta: { label: "Clienti" },
          },
          {
            name: "newsletters",
            list: "/newsletter/posta",
            create: "/newsletter/posta/create",
            edit: "/newsletter/posta/edit/:id",
            show: "/newsletter/posta/show/:id",
            meta: { label: "Posta" },
          },
          {
            name: "page_contents",
            list: "/contenuti",
            meta: { label: "Contenuti pagine" },
          },
        ]}
        options={{
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
          disableTelemetry: true,
        }}
      >
        <Routes>
          <Route
            element={
              <Authenticated key="authenticated-routes" fallback={<CatchAllNavigate to="/login" />}>
                <AppLayout>
                  <Outlet />
                </AppLayout>
              </Authenticated>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="/questions">
              <Route index element={<QuestionListPage />} />
              <Route path="create" element={<QuestionCreatePage />} />
              <Route path="edit/:id" element={<QuestionEditPage />} />
            </Route>
            <Route path="/newsletter">
              <Route element={<NewsletterLayout />}>
                <Route index element={<Navigate to="clienti" replace />} />
                <Route path="clienti" element={<SubscriberListPage />} />
                <Route path="posta" element={<NewsletterListPage />} />
              </Route>
              <Route path="posta/create" element={<NewsletterCreatePage />} />
              <Route path="posta/edit/:id" element={<NewsletterEditPage />} />
              <Route path="posta/show/:id" element={<NewsletterShowPage />} />
            </Route>
            <Route path="/contenuti">
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<HomePageContentPage />} />
            </Route>
          </Route>

          <Route
            element={
              <Authenticated key="auth-pages" fallback={<Outlet />}>
                <Navigate to="/" replace />
              </Authenticated>
            }
          >
            <Route path="/login" element={<LoginPage />} />
          </Route>
        </Routes>
        <UnsavedChangesNotifier />
        <DocumentTitleHandler />
      </Refine>
      <Toaster richColors position="top-right" />
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
