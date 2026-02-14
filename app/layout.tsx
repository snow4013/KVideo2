import React from 'react';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Analytics } from "@vercel/analytics/react";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { PasswordGate } from "@/components/PasswordGate";
import { siteConfig } from "@/lib/config/site-config";
import { AdKeywordsInjector } from "@/components/AdKeywordsInjector";
import { BackToTop } from "@/components/ui/BackToTop";
import { ScrollPositionManager } from "@/components/ScrollPositionManager";
import fs from 'fs';
import path from 'path';

// Server Component specifically for reading env/file (async for best practices)
async function AdKeywordsWrapper() {
  let keywords: string[] = [];

  try {
    // 1. Try reading from file (Docker runtime support)
    const keywordsFile = process.env.AD_KEYWORDS_FILE;
    if (keywordsFile) {
      // Resolve absolute path or relative to CWD
      const filePath = path.isAbsolute(keywordsFile)
        ? keywordsFile
        : path.join(process.cwd(), keywordsFile);

      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        keywords = content.split(/[\n,]/).map((k: string) => k.trim()).filter((k: string) => k);
        console.log(`[AdFilter] Loaded ${keywords.length} keywords from file: ${filePath}`);
      } catch (fileError: unknown) {
        // Handle file not found (ENOENT) gracefully
        if ((fileError as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn('[AdFilter] Error reading keywords file:', fileError);
        }
      }
    }

    // 2. Fallback to Env var (Runtime or Build time)
    if (keywords.length === 0) {
      const envKeywords = process.env.AD_KEYWORDS || process.env.NEXT_PUBLIC_AD_KEYWORDS;
      if (envKeywords) {
        keywords = envKeywords.split(/[\n,]/).map((k: string) => k.trim()).filter((k: string) => k);
      }
    }
  } catch (error) {
    console.warn('[AdFilter] Failed to load keywords:', error);
  }

  return <AdKeywordsInjector keywords={keywords} />;
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  icons: {
    icon: '/icon.png',
  },
  // 新增：完善视口配置（解决全屏适配核心）
  viewport: {
    width: 'device-width',
    initialScale: 1.0,
    maximumScale: 1.0,
    userScalable: false, // 禁止用户缩放
    viewportFit: 'cover', // 适配刘海屏/全面屏
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        {/* Apple PWA Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="KVideo" />
        <link rel="apple-touch-icon" href="/icon.png" />
        {/* Theme Color (for browser address bar) */}
        <meta name="theme-color" content="#000000" />
        {/* 调整：优化视口标签（和 metadata 里的配置互补，双重保障） */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
        // 新增：添加全屏状态的样式类监听（配合 CSS 使用）
        style={{ margin: 0, padding: 0, minHeight: '100vh' }}
      >
        <ThemeProvider>
          <PasswordGate hasEnvPassword={!!process.env.ACCESS_PASSWORD}>
            <AdKeywordsWrapper />
            {children}
            <BackToTop />
            <ScrollPositionManager />
          </PasswordGate>
          <Analytics />
          <ServiceWorkerRegister />
        </ThemeProvider>

        {/* ARIA Live Region for Screen Reader Announcements */}
        <div
          id="aria-live-announcer"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {/* Google Cast SDK */}
        <script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" async />

        {/* Scroll Performance Optimization Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                let scrollTimer;
                const body = document.body;
                
                function handleScroll() {
                  body.classList.add('scrolling');
                  clearTimeout(scrollTimer);
                  scrollTimer = setTimeout(function() {
                    body.classList.remove('scrolling');
                  }, 150);
                }
                
                let ticking = false;
                window.addEventListener('scroll', function() {
                  if (!ticking) {
                    window.requestAnimationFrame(function() {
                      handleScroll();
                      ticking = false;
                    });
                    ticking = true;
                  }
                }, { passive: true });

                // 新增：监听全屏事件，强制适配尺寸
                function handleFullscreenChange() {
                  if (document.fullscreenElement) {
                    // 进入全屏：隐藏滚动条，强制body占满屏幕
                    document.documentElement.style.overflow = 'hidden';
                    document.body.style.overflow = 'hidden';
                    document.body.style.width = '100vw';
                    document.body.style.height = '100vh';
                  } else {
                    // 退出全屏：恢复默认
                    document.documentElement.style.overflow = '';
                    document.body.style.overflow = '';
                    document.body.style.width = '';
                    document.body.style.height = '';
                  }
                }

                // 绑定全屏事件（兼容所有浏览器）
                document.addEventListener('fullscreenchange', handleFullscreenChange);
                document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
                document.addEventListener('mozfullscreenchange', handleFullscreenChange);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
