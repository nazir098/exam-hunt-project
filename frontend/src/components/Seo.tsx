import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://www.techmuzzle.in";
const SITE_NAME = "EduMaster AI";
const DEFAULT_TITLE = "EduMaster AI - NEET PYQ Practice, Mock Tests and AI Study Coach";
const DEFAULT_DESCRIPTION =
  "Practice NEET previous year questions by chapter, take mock tests, review solutions, and improve faster with AI-powered study analytics.";
const SOCIAL_IMAGE = `${SITE_URL}/og-image.svg`;

export type SeoConfig = {
  title: string;
  description: string;
  path: string;
  robots?: string;
  type?: "website" | "article";
};

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

function upsertJsonLd(id: string, data: unknown) {
  let element = document.getElementById(id) as HTMLScriptElement | null;
  if (!element) {
    element = document.createElement("script");
    element.id = id;
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }
  element.text = JSON.stringify(data);
}

export function applySeoConfig(seo: SeoConfig) {
  const canonicalUrl = `${SITE_URL}${seo.path}`;
  const robots = seo.robots || "index, follow";

  document.title = seo.title;
  upsertLink("canonical", canonicalUrl);
  upsertMeta('meta[name="description"]', "name", "description", seo.description);
  upsertMeta('meta[name="robots"]', "name", "robots", robots);
  upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", SITE_NAME);
  upsertMeta('meta[property="og:type"]', "property", "og:type", seo.type || "website");
  upsertMeta('meta[property="og:title"]', "property", "og:title", seo.title);
  upsertMeta('meta[property="og:description"]', "property", "og:description", seo.description);
  upsertMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
  upsertMeta('meta[property="og:image"]', "property", "og:image", SOCIAL_IMAGE);
  upsertMeta(
    'meta[property="og:image:alt"]',
    "property",
    "og:image:alt",
    "EduMaster AI NEET question bank and practice dashboard",
  );
  upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
  upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", seo.title);
  upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", seo.description);
  upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", SOCIAL_IMAGE);

  upsertJsonLd("edumaster-ai-jsonld", {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.svg`,
        description: DEFAULT_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/bank?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": seo.type === "article" ? "Article" : "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: seo.title,
        description: seo.description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
    ],
  });
}

function getSeoConfig(pathname: string): SeoConfig {
  if (pathname === "/bank") {
    return {
      title: "NEET Question Bank - PYQ Practice by Chapter | EduMaster AI",
      description:
        "Browse NEET previous year questions by subject, chapter, topic, and difficulty. Practice PYQs with solutions and AI recommendations.",
      path: "/bank",
    };
  }

  if (pathname.startsWith("/pack/")) {
    const packName = decodeURIComponent(pathname.split("/")[2] || "NEET").replace(/_/g, " ");
    return {
      title: `${packName} PYQ Question Bank | EduMaster AI`,
      description:
        "Solve NEET previous year questions from this paper with chapter filters, solutions, practice mode, and performance tracking.",
      path: pathname,
    };
  }

  if (pathname.startsWith("/solve/") || pathname.startsWith("/question/")) {
    return {
      title: "NEET PYQ Solution and AI Practice | EduMaster AI",
      description:
        "Review a NEET previous year question with answer options, solution guidance, and AI-powered practice support.",
      path: pathname,
      type: "article",
    };
  }

  if (pathname === "/practice") {
    return {
      title: "NEET Practice Arena - Adaptive PYQ Practice | EduMaster AI",
      description:
        "Start adaptive NEET practice sessions from PYQs, get instant feedback, and strengthen weak chapters with AI coaching.",
      path: "/practice",
    };
  }

  if (pathname === "/test/create") {
    return {
      title: "NEET Mock Test Builder - PYQ Test Practice | EduMaster AI",
      description:
        "Create NEET mock tests from previous year questions and review your score, solutions, and weak topics after submission.",
      path: "/test/create",
    };
  }

  if (pathname === "/analytics") {
    return {
      title: "NEET Study Analytics - Track Weak Chapters | EduMaster AI",
      description:
        "Track NEET practice accuracy, weak subjects, revision priorities, and study progress with AI-powered analytics.",
      path: "/analytics",
    };
  }

  if (pathname === "/leaderboard") {
    return {
      title: "NEET Practice Leaderboard | EduMaster AI",
      description:
        "Compete on the EduMaster AI NEET leaderboard and turn PYQ practice into a focused, measurable study habit.",
      path: "/leaderboard",
    };
  }

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/practice/") ||
    pathname.startsWith("/test/result") ||
    pathname.startsWith("/test/session") ||
    pathname.startsWith("/review/")
  ) {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      path: pathname,
      robots: "noindex, nofollow",
    };
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: "/",
  };
}

export default function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = getSeoConfig(pathname);
    applySeoConfig(seo);
  }, [pathname]);

  return null;
}
