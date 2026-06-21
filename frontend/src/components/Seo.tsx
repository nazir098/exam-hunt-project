import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../analytics";

const SITE_URL = "https://www.techmuzzle.in";
const PRODUCT_NAME = "EduMaster AI";
const OWNER_NAME = "Techmuzzle";
const SITE_NAME = "EduMaster AI by Techmuzzle";
const DEFAULT_TITLE = "NEET PYQ Previous Year Questions 2016-2025 | Free Practice & Mock Tests – EduMaster AI";
const DEFAULT_DESCRIPTION =
  "Practice NEET previous year questions (PYQ) from 2016 to 2025 chapter-wise. Take free mock tests, get AI explanations, and track your performance. Best NEET preparation platform for Biology, Physics & Chemistry.";
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

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
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

function buildGraph(seo: SeoConfig) {
  const canonicalUrl = `${SITE_URL}${seo.path}`;
  return [
    {
      "@type": "EducationalOrganization",
      "@id": `${SITE_URL}/#organization`,
      name: OWNER_NAME,
      alternateName: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.svg`,
      description: DEFAULT_DESCRIPTION,
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: PRODUCT_NAME,
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
  ];
}

function buildFaqSchema() {
  return {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: [
      {
        "@type": "Question",
        name: "Where can I find NEET previous year questions (PYQ) with solutions?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "EduMaster AI provides NEET PYQs from 2016 to 2025 with detailed solutions, chapter-wise filtering, and AI-powered explanations for Biology, Physics, and Chemistry.",
        },
      },
      {
        "@type": "Question",
        name: "Is EduMaster AI free for NEET preparation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, EduMaster AI offers free access to NEET previous year questions, practice sets, and mock tests. AI explanations and performance analytics are included.",
        },
      },
      {
        "@type": "Question",
        name: "How can I practice NEET questions chapter-wise?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use the Question Bank on EduMaster AI to filter NEET PYQs by subject (Physics, Chemistry, Biology), chapter, topic, and difficulty level. Start practice sessions directly from any question.",
        },
      },
      {
        "@type": "Question",
        name: "Can I take NEET mock tests online for free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, EduMaster AI has a Mock Test Builder where you can create custom NEET tests from previous year papers. Choose subjects, number of questions, and time limit to simulate real exam conditions.",
        },
      },
      {
        "@type": "Question",
        name: "How does EduMaster AI help improve my NEET score?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "EduMaster AI tracks your accuracy, identifies weak chapters, suggests revision topics, and provides AI tutoring to explain concepts you got wrong. The analytics dashboard shows your progress over time.",
        },
      },
      {
        "@type": "Question",
        name: "What years of NEET papers are available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "EduMaster AI covers NEET papers from 2016 to 2025, including all subjects and chapters with full solutions and practice mode.",
        },
      },
    ],
  };
}

export function applySeoConfig(seo: SeoConfig) {
  const canonicalUrl = `${SITE_URL}${seo.path}`;
  const robots = seo.robots || "index, follow";

  document.title = seo.title;
  upsertLink("canonical", canonicalUrl);
  upsertMeta('meta[name="description"]', "name", "description", seo.description);
  upsertMeta('meta[name="robots"]', "name", "robots", robots);
  upsertMeta('meta[name="keywords"]', "name", "keywords",
    "NEET PYQ, NEET previous year questions, NEET 2025 paper, NEET 2024 paper, NEET practice, NEET mock test, NEET question bank, NEET preparation, NEET Biology, NEET Physics, NEET Chemistry, chapter-wise NEET questions, NEET solutions, free NEET practice, NEET exam preparation");
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
    "NEET previous year questions practice and mock tests on EduMaster AI",
  );
  upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
  upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", seo.title);
  upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", seo.description);
  upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", SOCIAL_IMAGE);

  const graph = buildGraph(seo);

  // Add FAQ schema only on homepage
  if (seo.path === "/") {
    graph.push(buildFaqSchema());
  } else {
    removeJsonLd("edumaster-ai-jsonld-faq");
  }

  upsertJsonLd("edumaster-ai-jsonld", {
    "@context": "https://schema.org",
    "@graph": graph,
  });
}

function getSeoConfig(pathname: string): SeoConfig {
  if (pathname === "/bank") {
    return {
      title: "NEET Question Bank 2016-2025 - PYQ Practice by Chapter | EduMaster AI",
      description:
        "Browse 10,000+ NEET previous year questions by subject, chapter, topic, and difficulty. Practice PYQs with solutions, AI explanations, and performance tracking.",
      path: "/bank",
    };
  }

  if (pathname.startsWith("/pack/")) {
    const packName = decodeURIComponent(pathname.split("/")[2] || "NEET").replace(/_/g, " ");
    return {
      title: `${packName} NEET PYQ Question Paper with Solutions | EduMaster AI`,
      description:
        `Solve ${packName} NEET previous year questions with detailed solutions, chapter-wise filters, practice mode, and performance tracking. Free NEET paper practice.`,
      path: pathname,
    };
  }

  if (pathname.startsWith("/solve/") || pathname.startsWith("/question/")) {
    return {
      title: "NEET PYQ Solution with AI Explanation | EduMaster AI",
      description:
        "Review a NEET previous year question with answer options, detailed solution, AI-powered explanation, and similar practice questions.",
      path: pathname,
      type: "article",
    };
  }

  if (pathname === "/practice") {
    return {
      title: "NEET Practice Sets - Adaptive PYQ Practice | Free Online – EduMaster AI",
      description:
        "Start adaptive NEET practice sessions from previous year questions. Get instant feedback, AI coaching, and strengthen weak chapters. Free NEET practice online.",
      path: "/practice",
    };
  }

  if (pathname === "/test/create") {
    return {
      title: "NEET Mock Test 2025 - Free Online Practice Test | EduMaster AI",
      description:
        "Create free NEET mock tests from previous year questions. Simulate real exam conditions, review your score, solutions, and weak topics after submission.",
      path: "/test/create",
    };
  }

  if (pathname === "/analytics") {
    return {
      title: "NEET Study Analytics - Track Performance & Weak Chapters | EduMaster AI",
      description:
        "Track NEET practice accuracy, identify weak subjects and chapters, prioritize revision, and monitor study progress with AI-powered analytics.",
      path: "/analytics",
    };
  }

  if (pathname === "/leaderboard") {
    return {
      title: "NEET Practice Leaderboard - Compete with Students | EduMaster AI",
      description:
        "Compete on the EduMaster AI NEET leaderboard. Compare your PYQ practice performance with other NEET aspirants and stay motivated.",
      path: "/leaderboard",
    };
  }

  if (pathname === "/revision") {
    return {
      title: "NEET Revision Queue - Revise Weak Topics | EduMaster AI",
      description:
        "Revise your NEET weak chapters with a smart revision queue. Focus on questions you got wrong and strengthen your preparation.",
      path: "/revision",
    };
  }

  if (pathname === "/review/wrong-attempts") {
    return {
      title: "NEET Wrong Attempts Review - Learn from Mistakes | EduMaster AI",
      description:
        "Review all NEET questions you got wrong. Understand mistakes with AI explanations and practice similar questions to improve your score.",
      path: "/review/wrong-attempts",
    };
  }

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/practice/") ||
    pathname.startsWith("/test/result") ||
    pathname.startsWith("/test/session")
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
    trackPageView(pathname, seo.title);
  }, [pathname]);

  return null;
}
