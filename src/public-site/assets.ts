export const PUBLIC_SITE_CSS = String.raw`.vh-tools-main {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.article-list-main > section.article-list > .vh-article-item > header > h3 > .vh-article-cat::before {
  content: none !important;
}

.article-list-main > section.article-list > .vh-article-item > header > h3::before,
.article-list-main > section.article-list > .vh-article-item > header > .title::before,
.article-list-main > section.article-list > .vh-article-item > .vh-article-excerpt::before,
.article-list-main > section.article-list > .vh-article-item > .vh-article-taglist::before {
  content: none !important;
  display: none !important;
}

.vh-tools-main > .vh-page-header {
  box-sizing: border-box;
  padding: 1rem;
  background-color: var(--vh-white-color);
  box-shadow: var(--vh-box-shadow);
  border-radius: 0.5rem;
}

.vh-tools-main > .vh-page-header h1,
.vh-tools-main > .vh-page-header p {
  padding: 0;
}

.vh-tools-main > main {
  box-sizing: border-box;
  border-radius: 0.5rem;
  width: 100%;
  height: max-content;
}

.vh-tools-main > main.main.links-main {
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  background-color: var(--vh-white-color);
}

.vh-tools-main > main.main.links-main > a {
  position: relative;
  box-sizing: border-box;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  height: 5.5rem;
  border-radius: 0.88rem;
  transition: background-color 0.18s ease-in-out;
  overflow: hidden;
  z-index: 1;
}

.vh-tools-main > main.main.links-main > a:hover {
  background-color: var(--vh-font-16);
}

.vh-tools-main > main.main.links-main > a:hover > .avatar {
  transform: scale(1.2) rotate(8deg);
  background-color: var(--vh-white-color);
  border-color: var(--vh-white-color);
}

.vh-tools-main > main.main.links-main > a > .avatar {
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 0.18rem;
  width: 3.36rem;
  height: 3.36rem;
  border-radius: 50%;
  border: solid 1px var(--vh-font-16);
  object-fit: cover;
  overflow: hidden;
  opacity: 1;
  transition: all 0.18s;
}

.vh-tools-main > main.main.links-main > a > .link-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.68rem;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 1;
}

.vh-tools-main > main.main.links-main > a > .link-info > span {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1rem;
}

.vh-tools-main > main.main.links-main > a > .link-info > p {
  box-sizing: border-box;
  padding: 0;
  width: 100%;
  height: max-content;
  font-size: 0.81rem;
  color: var(--vh-font-56);
  line-height: 1rem;
}

.vh-tools-main > main.main.talking-main {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.vh-tools-main > main.main.talking-main > article {
  box-sizing: border-box;
  padding: 2.188rem 1.875rem;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: max-content;
  border-radius: 0.5rem;
  background-color: var(--vh-white-color);
  box-shadow: var(--vh-box-shadow);
  overflow: hidden;
}

.vh-tools-main > main.main.talking-main > article > header {
  display: flex;
  align-items: center;
  gap: 0.626rem;
  width: 100%;
  height: 2.5rem;
}

.vh-tools-main > main.main.talking-main > article > header > img {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
}

.vh-tools-main > main.main.talking-main > article > header > .info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
  line-height: 1.26rem;
  overflow: hidden;
}

.vh-tools-main > main.main.talking-main > article > header > .info > span {
  font-size: 0.875rem;
}

.vh-tools-main > main.main.talking-main > article > header > .info > time {
  font-size: 0.7rem;
  color: var(--vh-font-66);
}

.vh-tools-main > main.main.talking-main > article > .main {
  box-sizing: border-box;
  padding: 1rem 0;
  font-size: 0.875rem;
  font-weight: 500;
}

.vh-tools-main > main.main.talking-main > article > .main > :not(.vh-img-flex) img {
  display: block;
  box-sizing: border-box;
  max-width: min(100%, 22rem);
  width: auto;
  height: auto;
  margin-top: 0.75rem;
  border-radius: 0.5rem;
  object-fit: contain;
}

.vh-tools-main > main.main.talking-main > article > .main > .vh-img-flex {
  --vh-moment-media-gap: 0.66rem;
  --vh-moment-media-size: clamp(4.75rem, 18vw, 7rem);
  box-sizing: border-box;
  padding-top: 0.8rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, var(--vh-moment-media-size)));
  gap: var(--vh-moment-media-gap);
  width: fit-content;
  max-width: 100%;
}

.vh-tools-main > main.main.talking-main > article > .main > .vh-img-flex[data-media-count='1'] {
  grid-template-columns: minmax(0, 1fr);
  width: min(18rem, 100%);
}

.vh-tools-main > main.main.talking-main > article > .main > .vh-img-flex[data-media-count='2'],
.vh-tools-main > main.main.talking-main > article > .main > .vh-img-flex[data-media-count='4'] {
  grid-template-columns: repeat(2, minmax(0, var(--vh-moment-media-size)));
}

.vh-tools-main > main.main.talking-main > article > .main > .vh-img-flex > .vh-img-grid-item {
  appearance: none;
  position: relative;
  display: block;
  box-sizing: border-box;
  padding: 0;
  width: 100%;
  aspect-ratio: 1 / 1;
  border: none;
  border-radius: 0.5rem;
  background-color: var(--vh-font-16);
  font: inherit;
  cursor: zoom-in;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.vh-tools-main > main.main.talking-main > article > .main > .vh-img-flex > .vh-img-grid-item > img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.2s ease-in-out;
}

.vh-tools-main > main.main.talking-main > article > .main > .vh-img-flex > .vh-img-grid-item:focus-visible {
  outline: 2px solid var(--vh-main-color);
  outline-offset: 3px;
}

.vh-tools-main > main.main.talking-main > article > .main > .vh-img-flex > .vh-img-grid-item:hover > img {
  transform: scale(1.03);
}

body.vh-lightbox-open {
  overflow: hidden;
}

.vh-lightbox {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 4vw, 2rem);
  background: rgba(10, 17, 25, 0.82);
  backdrop-filter: blur(14px);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.vh-lightbox.active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.vh-lightbox-dialog {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(100%, 78rem);
  max-height: 100%;
  transform: translateY(0.75rem) scale(0.98);
  transition: transform 0.2s ease;
}

.vh-lightbox.active .vh-lightbox-dialog {
  transform: translateY(0) scale(1);
}

.vh-lightbox-stage {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  padding: clamp(2.75rem, 4vw, 3.5rem) clamp(0.5rem, 4vw, 4rem) clamp(2.25rem, 3vw, 2.75rem);
}

.vh-lightbox-figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
}

.vh-lightbox-image {
  display: block;
  max-width: 100%;
  max-height: min(78vh, 56rem);
  width: auto;
  height: auto;
  border-radius: 0.9rem;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
  object-fit: contain;
}

.vh-lightbox-caption {
  min-height: 1.2rem;
  font-size: 0.86rem;
  color: rgba(255, 255, 255, 0.82);
  text-align: center;
}

.vh-lightbox-close,
.vh-lightbox-nav {
  appearance: none;
  position: absolute;
  z-index: 1;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.75rem;
  height: 2.75rem;
  padding: 0 0.88rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background: rgba(15, 23, 33, 0.56);
  color: #fff;
  font: inherit;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: transform 0.18s ease, background-color 0.18s ease, opacity 0.18s ease;
  -webkit-tap-highlight-color: transparent;
}

.vh-lightbox-close:hover,
.vh-lightbox-nav:hover {
  background: rgba(15, 23, 33, 0.72);
  transform: translateY(-1px);
}

.vh-lightbox-close:focus-visible,
.vh-lightbox-nav:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.9);
  outline-offset: 2px;
}

.vh-lightbox-close {
  top: 0;
  right: clamp(0.5rem, 2vw, 1rem);
}

.vh-lightbox-nav[data-direction='prev'] {
  left: max(0rem, calc(clamp(0.5rem, 4vw, 4rem) - 1rem));
}

.vh-lightbox-nav[data-direction='next'] {
  right: max(0rem, calc(clamp(0.5rem, 4vw, 4rem) - 1rem));
}

.vh-lightbox-nav[disabled] {
  opacity: 0;
  cursor: default;
  pointer-events: none;
  transform: none;
}

.vh-tools-main > main.main.talking-main > article > footer {
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  gap: 0.58rem;
  width: 100%;
}

.vh-tools-main > main.main.talking-main > article > footer > span {
  box-sizing: border-box;
  padding: 0.28rem 0.68rem;
  display: flex;
  align-items: center;
  height: 1.68rem;
  width: max-content;
  border: 1px solid var(--vh-main-color);
  border-radius: var(--vh-main-radius);
  background-color: var(--vh-white-color);
  font-size: 0.72rem;
  color: var(--vh-main-color);
  transition: all 0.2s ease-in-out;
  user-select: none;
}

.vh-page .vh-comment-item,
.vh-tools-main .vh-comment-item {
  position: relative;
  box-sizing: border-box;
  padding: 1rem 1.08rem;
  border-radius: 0.88rem;
  background-color: #f8f9fa;
  border: 1px solid var(--vh-font-16);
}

.vh-page .comment-actions,
.vh-tools-main .comment-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.vh-page .comment-reply-button,
.vh-tools-main .comment-reply-button,
.vh-page .comment-form-meta > button,
.vh-tools-main .comment-form-meta > button {
  box-sizing: border-box;
  padding: 0.32rem 0.72rem;
  border: 1px solid var(--vh-main-color);
  border-radius: 999px;
  background-color: var(--vh-white-color);
  color: var(--vh-main-color);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.18s ease-in-out;
}

.vh-page .comment-reply-button:hover,
.vh-tools-main .comment-reply-button:hover,
.vh-page .comment-form-meta > button:hover,
.vh-tools-main .comment-form-meta > button:hover {
  background-color: var(--vh-main-color);
  color: var(--vh-white-color);
}

.vh-page .comment-children,
.vh-tools-main .comment-children {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.vh-page .vh-comment-item.child,
.vh-tools-main .vh-comment-item.child {
  margin-left: 1.5rem;
  background-color: var(--vh-white-color);
}

.vh-page .comment-head,
.vh-tools-main .comment-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.88rem;
}

.vh-page .comment-author,
.vh-tools-main .comment-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.vh-page .comment-author > img,
.vh-tools-main .comment-author > img {
  flex-shrink: 0;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--vh-font-16);
  background-color: var(--vh-white-color);
}

.vh-page .comment-author > strong,
.vh-page .comment-author > a,
.vh-tools-main .comment-author > strong,
.vh-tools-main .comment-author > a {
  font-size: 0.98rem;
  line-height: 1.2;
}

.vh-page .comment-head > time,
.vh-tools-main .comment-head > time {
  flex-shrink: 0;
  font-size: 0.76rem;
  color: var(--vh-font-56);
  line-height: 1.4;
}

.vh-page .comment-content,
.vh-tools-main .comment-content {
  margin-top: 0.66rem;
  color: var(--vh-font-color);
  font-size: 0.9rem;
  line-height: 1.82;
  white-space: pre-wrap;
  word-break: break-word;
}

.vh-page .comment-form-meta,
.vh-tools-main .comment-form-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.88rem;
  box-sizing: border-box;
  padding: 0.75rem 0.88rem;
  border-radius: 0.75rem;
  background: var(--vh-main-color-6);
  color: var(--vh-font-color);
}

.vh-page .comment-form-meta.is-hidden,
.vh-tools-main .comment-form-meta.is-hidden {
  display: none;
}

.vh-page .comment-form-meta > span,
.vh-tools-main .comment-form-meta > span {
  font-size: 0.82rem;
  color: var(--vh-font-66);
}

.vh-page form.vh-comment-form,
.vh-tools-main form.vh-comment-form {
  display: flex;
  flex-direction: column;
  gap: 0.88rem;
  box-sizing: border-box;
  padding: 1rem;
  border-radius: 0.88rem;
  background-color: #f8f9fa;
  border: 1px solid var(--vh-font-16);
}

.vh-page form.vh-comment-form .vh-form-grid,
.vh-tools-main form.vh-comment-form .vh-form-grid {
  display: grid;
  gap: 0.88rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.vh-page form.vh-comment-form label,
.vh-tools-main form.vh-comment-form label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--vh-font-66);
}

.vh-page form.vh-comment-form input,
.vh-page form.vh-comment-form textarea,
.vh-tools-main form.vh-comment-form input,
.vh-tools-main form.vh-comment-form textarea {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--vh-font-16);
  border-radius: 0.66rem;
  padding: 0.82rem 0.92rem;
  background-color: var(--vh-white-color);
  color: var(--vh-font-color);
  font-size: 0.92rem;
  transition: border-color 0.18s ease-in-out, box-shadow 0.18s ease-in-out;
}

.vh-page form.vh-comment-form input:focus,
.vh-page form.vh-comment-form textarea:focus,
.vh-tools-main form.vh-comment-form input:focus,
.vh-tools-main form.vh-comment-form textarea:focus {
  border-color: var(--vh-main-color);
  box-shadow: 0 0 0 3px var(--vh-main-color-16);
}

.vh-page form.vh-comment-form textarea,
.vh-tools-main form.vh-comment-form textarea {
  min-height: 9rem;
  resize: vertical;
}

.vh-page form.vh-comment-form .comment-form-actions,
.vh-tools-main form.vh-comment-form .comment-form-actions {
  display: flex;
  align-items: center;
  gap: 0.88rem;
  flex-wrap: wrap;
}

.vh-page form.vh-comment-form .comment-form-actions > button,
.vh-tools-main form.vh-comment-form .comment-form-actions > button {
  box-sizing: border-box;
  min-width: 7rem;
  height: 2.5rem;
  border: none;
  border-radius: 0.66rem;
  color: #fff;
  background-color: var(--vh-main-color);
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 600;
  transition: transform 0.18s ease-in-out, opacity 0.18s ease-in-out;
}

.vh-page form.vh-comment-form .comment-form-actions > button:hover,
.vh-tools-main form.vh-comment-form .comment-form-actions > button:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.vh-page .status-message,
.vh-tools-main .status-message {
  font-size: 0.82rem;
  color: var(--vh-font-66);
}

.vh-tools-main .moment-entry > footer {
  margin-top: 0.25rem;
}

.vh-tools-main .moment-action {
  box-sizing: border-box;
  padding: 0.28rem 0.68rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  height: 1.68rem;
  width: max-content;
  border: 1px solid var(--vh-main-color);
  border-radius: var(--vh-main-radius);
  background-color: var(--vh-white-color);
  font-size: 0.72rem;
  color: var(--vh-main-color);
  transition: all 0.2s ease-in-out;
  user-select: none;
}

.vh-tools-main button.moment-action {
  cursor: pointer;
}

.vh-tools-main button.moment-action:hover,
.vh-tools-main button.moment-action.is-liked {
  background-color: var(--vh-main-color);
  color: var(--vh-white-color);
}

.vh-tools-main .moment-action strong {
  font-weight: 700;
}

.vh-tools-main .moment-interactions {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--vh-font-16);
}

.vh-tools-main .moment-interactions.is-collapsed {
  display: none;
}

.vh-tools-main .moment-comment-list {
  display: grid;
  gap: 0.88rem;
}

.vh-footer > section.text {
  align-items: center;
  justify-content: center;
  text-align: center;
}

.vh-footer > section.text > p {
  text-align: center;
}

article.vh-article-main > main img {
  display: block;
  box-sizing: border-box;
  max-width: 100% !important;
  width: auto !important;
  height: auto !important;
  max-height: min(36rem, 82vh);
  margin: 1rem auto;
  border-radius: 0.75rem;
  object-fit: contain;
}

article.vh-article-main > main a.vh-article-lightbox-trigger {
  display: block;
  width: fit-content;
  max-width: 100%;
  margin: 1rem auto;
  border-radius: 0.75rem;
  cursor: zoom-in;
}

article.vh-article-main > main a.vh-article-lightbox-trigger > img {
  margin: 0 auto;
}

article.vh-article-main > main img.vh-article-lightbox-trigger {
  cursor: zoom-in;
  -webkit-tap-highlight-color: transparent;
}

article.vh-article-main > main img.vh-article-lightbox-trigger:focus-visible,
article.vh-article-main > main a.vh-article-lightbox-trigger:focus-visible {
  outline: 2px solid var(--vh-main-color);
  outline-offset: 3px;
}

article.vh-article-main > main pre {
  position: relative;
  box-sizing: border-box;
  margin: 1.25rem 0;
  padding: 3rem 1rem 1rem;
  max-width: 100%;
  overflow: auto;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 1rem;
  background: linear-gradient(180deg, #1f2937 0%, #111827 100%) !important;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.18);
}

article.vh-article-main > main pre::before {
  content: "";
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: 3rem;
  height: 0.75rem;
  background:
    radial-gradient(circle at 0.375rem 0.375rem, #ff5f57 0, #ff5f57 0.32rem, transparent 0.34rem),
    radial-gradient(circle at 1.5rem 0.375rem, #febc2e 0, #febc2e 0.32rem, transparent 0.34rem),
    radial-gradient(circle at 2.625rem 0.375rem, #28c840 0, #28c840 0.32rem, transparent 0.34rem);
}

article.vh-article-main > main pre::after {
  content: attr(data-code-lang);
  position: absolute;
  top: 0.78rem;
  right: 4.8rem;
  padding: 0.16rem 0.52rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
  color: #cbd5e1;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

article.vh-article-main > main pre code {
  display: block;
  padding: 0;
  background: transparent !important;
  color: #e5eefb;
  font-size: 0.86rem;
  line-height: 1.8;
  white-space: pre;
}

article.vh-article-main > main :not(pre) > code {
  padding: 0.12rem 0.42rem;
  border-radius: 0.42rem;
  background: rgba(15, 23, 42, 0.08);
  color: #0f766e;
  font-size: 0.84rem;
}

article.vh-article-main > main .code-copy-button {
  position: absolute;
  top: 0.72rem;
  right: 1rem;
  box-sizing: border-box;
  padding: 0.28rem 0.64rem;
  border: 1px solid rgba(203, 213, 225, 0.18);
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  color: #e2e8f0;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s ease-in-out, border-color 0.18s ease-in-out, transform 0.18s ease-in-out;
}

article.vh-article-main > main .code-copy-button:hover {
  background: rgba(148, 163, 184, 0.2);
  border-color: rgba(203, 213, 225, 0.34);
  transform: translateY(-1px);
}

article.vh-article-main > main .code-copy-button.is-copied {
  background: rgba(34, 197, 94, 0.18);
  border-color: rgba(34, 197, 94, 0.34);
  color: #dcfce7;
}

section.vh-archive-main {
  flex: 1;
  padding: 2rem 1rem;
  border-radius: 1rem;
  background-color: var(--vh-white-color);
  overflow: hidden;
}

section.vh-archive-main > .archive-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

section.vh-archive-main > .archive-list > .archive-list-item {
  display: flex;
  flex-direction: column;
}

section.vh-archive-main > .archive-list > .archive-list-item > p,
section.vh-archive-main > .archive-list > .archive-list-item > a {
  display: flex;
  align-items: center;
  width: 100%;
  height: 2.5rem;
  border-radius: 1rem;
  font-size: 1rem;
  transition: background 0.18s;
}

section.vh-archive-main > .archive-list > .archive-list-item > a:hover {
  background-color: #eeeff3;
}

section.vh-archive-main > .archive-list > .archive-list-item > a:hover > i::before {
  height: 50.66%;
}

section.vh-archive-main > .archive-list > .archive-list-item > a:hover > span {
  padding-left: 0.28rem;
}

section.vh-archive-main > .archive-list > .archive-list-item > a > em {
  flex-shrink: 0;
  width: 5.05rem;
  height: 3.75rem;
  color: var(--vh-font-28);
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 3.75rem;
  text-align: right;
  font-style: normal;
}

section.vh-archive-main > .archive-list > .archive-list-item > a > i::before {
  width: 0.25rem;
  height: 0.25rem;
  border: none;
  border-radius: 0.25rem;
  background-color: #4e667f;
}

section.vh-archive-main > .archive-list > .archive-list-item > a > i::after {
  content: "";
  position: absolute;
  width: 0.125rem;
  height: 1rem;
  left: calc(50% - 0.0625rem);
  transform: translateY(-50%);
  border-left: 2px dashed rgba(0, 0, 0, 0.1);
  pointer-events: none;
}

section.vh-archive-main > .archive-list > .archive-list-item > a > span {
  font-size: 1rem;
  color: var(--vh-font-color);
  font-weight: 600;
}

section.vh-archive-main > .archive-list > .archive-list-item > p > em {
  flex-shrink: 0;
  width: 5.05rem;
  height: 3.75rem;
  color: var(--vh-font-color);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 3.75rem;
  text-align: right;
  font-style: normal;
}

section.vh-archive-main > .archive-list > .archive-list-item > p > i,
section.vh-archive-main > .archive-list > .archive-list-item > a > i {
  position: relative;
  width: 2.5rem;
  height: 100%;
}

section.vh-archive-main > .archive-list > .archive-list-item > p > i::before,
section.vh-archive-main > .archive-list > .archive-list-item > a > i::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: block;
  width: 0.36rem;
  height: 0.36rem;
  border: solid 0.28rem #0000006d;
  border-radius: 50%;
  background-color: var(--vh-white-color);
  transition: all 0.3s;
}

section.vh-archive-main > .archive-list > .archive-list-item > p > span,
section.vh-archive-main > .archive-list > .archive-list-item > a > span {
  flex: 1;
  color: var(--vh-font-66);
  font-weight: 500;
  transition: all 0.18s;
}

section.vh-archive-main > .archive-list > .archive-list-item > p > cite,
section.vh-archive-main > .archive-list > .archive-list-item > a > cite {
  margin-left: auto;
  width: 7.8rem;
  font-size: 0.875rem;
  color: var(--vh-font-66);
  font-weight: 400;
  font-style: normal;
}

section.vh-art-page.vh-inline-page {
  position: static;
  bottom: auto;
  right: auto;
  justify-content: flex-end;
  padding: 0;
  margin-top: 1rem;
}

.vh-tools-main > main.main + section.vh-art-page.vh-inline-page {
  margin-top: 0;
}

@media screen and (max-width: 1198px) {
  section.vh-archive-main > .archive-list > .archive-list-item > p > cite,
  section.vh-archive-main > .archive-list > .archive-list-item > a > cite {
    display: none;
  }
}

@media screen and (max-width: 888px) {
  .vh-page form.vh-comment-form .vh-form-grid,
  .vh-tools-main form.vh-comment-form .vh-form-grid {
    grid-template-columns: 1fr;
  }

  .vh-page .vh-comment-item.child,
  .vh-tools-main .vh-comment-item.child {
    margin-left: 0.88rem;
  }

  .vh-tools-main > main.main.links-main {
    grid-template-columns: repeat(2, 1fr);
  }

  .vh-tools-main > main.main.talking-main > article {
    padding: 1.06rem 0.88rem;
  }

  .vh-tools-main > main.main.talking-main > article > .main > .vh-img-flex {
    --vh-moment-media-gap: 0.55rem;
    --vh-moment-media-size: clamp(4.2rem, 24vw, 5.75rem);
  }

  .vh-tools-main > main.main.talking-main > article > .main > .vh-img-flex[data-media-count='1'] {
    width: min(13.5rem, 100%);
  }

  .vh-lightbox {
    padding: 0.88rem;
  }

  .vh-lightbox-stage {
    padding: 3.4rem 0 2.2rem;
  }

  .vh-lightbox-image {
    max-height: min(72vh, 34rem);
    border-radius: 0.72rem;
  }

  .vh-lightbox-close,
  .vh-lightbox-nav {
    min-width: 2.5rem;
    height: 2.5rem;
  }

  .vh-lightbox-close {
    top: 0.15rem;
    right: 0;
  }

  .vh-lightbox-nav[data-direction='prev'] {
    left: 0;
  }

  .vh-lightbox-nav[data-direction='next'] {
    right: 0;
  }

  section.vh-archive-main {
    padding: 0;
    background-color: transparent;
  }

  section.vh-archive-main > .archive-list > .archive-list-item > p > em {
    width: 3rem;
    font-size: 1.2rem;
  }

  section.vh-archive-main > .archive-list > .archive-list-item > p > i,
  section.vh-archive-main > .archive-list > .archive-list-item > a > i {
    width: 1.8rem;
  }

  section.vh-archive-main > .archive-list > .archive-list-item > p > span,
  section.vh-archive-main > .archive-list > .archive-list-item > a > span {
    font-size: 0.8rem;
  }

  section.vh-archive-main > .archive-list > .archive-list-item > a > em {
    width: 3rem;
    font-size: 0.62rem;
  }

  section.vh-archive-main > .archive-list > .archive-list-item > a > span {
    font-size: 0.88rem;
  }
}

@media screen and (max-width: 568px) {
  .vh-tools-main > main.main.links-main {
    grid-template-columns: 1fr;
  }
}`;

export const PUBLIC_SITE_JS = String.raw`(() => {
  const search = document.querySelector('.vh-search');
  const searchForm = search?.querySelector('form');
  const searchInput = search?.querySelector('input');
  const searchList = search?.querySelector('[data-search-list]');
  const searchHint = searchList?.querySelector('em');
  const searchItems = Array.from(searchList?.querySelectorAll('.vh-search-item') || []);
  const searchButton = document.querySelector('.search-btn');
  const menuButton = document.querySelector('.menu-btn');
  const mobileSidebar = document.querySelector('.vh-mobilesidebar');
  const backTop = document.querySelector('.vh-back-top');
  const typewriteTarget = document.querySelector('.header-main .desc');
  const momentToggleButtons = Array.from(document.querySelectorAll('[data-moment-toggle]'));

  const syncMomentToggleLabel = (button, expanded) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    const count = button.getAttribute('data-comment-count') || '0';
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    button.innerHTML = (expanded ? '收起评论 ' : '评论 ') + count;
  };

  const openMomentInteractions = (momentId) => {
    const panel = document.querySelector('[data-moment-interactions][data-moment-id="' + momentId + '"]');
    if (panel instanceof HTMLElement) {
      panel.classList.remove('is-collapsed');
    }
  };

  momentToggleButtons.forEach((button) => {
    const momentId = String(button.getAttribute('data-moment-id') || '');
    const panel = document.querySelector('[data-moment-interactions][data-moment-id="' + momentId + '"]');
    const expanded = panel instanceof HTMLElement ? !panel.classList.contains('is-collapsed') : false;
    syncMomentToggleLabel(button, expanded);

    button.addEventListener('click', () => {
      if (!(button instanceof HTMLButtonElement) || !momentId || !(panel instanceof HTMLElement)) {
        return;
      }
      const isCollapsed = panel.classList.toggle('is-collapsed');
      syncMomentToggleLabel(button, !isCollapsed);
    });
  });

  const openSearch = () => search?.classList.add('active');
  const closeSearch = () => search?.classList.remove('active');
  const closeSidebar = () => mobileSidebar?.classList.remove('active');

  const toggleSidebar = () => {
    mobileSidebar?.classList.toggle('active');
  };

  const syncBackTop = () => {
    if (!backTop) {
      return;
    }
    backTop.classList.toggle('active', window.scrollY > 360);
  };

  const lazyImages = Array.from(document.querySelectorAll('img[data-vh-lz-src]'));
  lazyImages.forEach((img) => {
    const target = img.getAttribute('data-vh-lz-src');
    if (!target) {
      return;
    }
    const markLoaded = () => img.classList.add('loaded');
    if (img.getAttribute('src') === target && img.complete) {
      markLoaded();
      return;
    }
    img.addEventListener('load', markLoaded, { once: true });
    img.setAttribute('src', target);
  });

  const articleBodies = Array.from(document.querySelectorAll('article.vh-article-main > main'));
  articleBodies.forEach((articleBody, articleIndex) => {
    if (!(articleBody instanceof HTMLElement)) {
      return;
    }

    const articleImages = Array.from(articleBody.querySelectorAll('img'));
    articleImages.forEach((img, imageIndex) => {
      if (!(img instanceof HTMLImageElement) || img.hasAttribute('data-vh-lightbox-trigger')) {
        return;
      }

      const src = img.currentSrc || img.getAttribute('src') || '';
      if (!src) {
        return;
      }

      const alt = String(
        img.getAttribute('alt') || img.getAttribute('title') || '文章图片 ' + String(imageIndex + 1),
      );
      const wrapperLink = img.closest('a');
      const useWrapperLink =
        wrapperLink instanceof HTMLAnchorElement &&
        wrapperLink.querySelectorAll('img').length === 1 &&
        !String(wrapperLink.textContent || '').trim();
      const trigger = useWrapperLink ? wrapperLink : img;

      if (!(trigger instanceof HTMLElement)) {
        return;
      }

      trigger.classList.add('vh-article-lightbox-trigger');
      trigger.setAttribute('data-vh-lightbox-trigger', '');
      trigger.setAttribute('data-vh-lightbox-group', 'article-' + String(articleIndex + 1));
      trigger.setAttribute('data-vh-lightbox-src', src);
      trigger.setAttribute('data-vh-lightbox-alt', alt);
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-label', alt ? '查看图片：' + alt : '查看大图');

      if (!(trigger instanceof HTMLAnchorElement) && !(trigger instanceof HTMLButtonElement)) {
        trigger.setAttribute('role', 'button');
        trigger.tabIndex = 0;
      }
    });
  });

  const lightboxTriggers = Array.from(document.querySelectorAll('[data-vh-lightbox-trigger]'));
  let isLightboxOpen = () => false;
  let closeLightbox = () => {};
  let showPreviousLightboxItem = () => {};
  let showNextLightboxItem = () => {};

  if (lightboxTriggers.length) {
    const lightbox = document.createElement('div');
    lightbox.className = 'vh-lightbox';
    lightbox.setAttribute('hidden', '');
    lightbox.innerHTML =
      '<div class="vh-lightbox-dialog" role="dialog" aria-modal="true" aria-label="图片预览">' +
      '<div class="vh-lightbox-stage">' +
      '<button type="button" class="vh-lightbox-close" aria-label="关闭预览">关闭</button>' +
      '<button type="button" class="vh-lightbox-nav" data-direction="prev" aria-label="上一张">&lt;</button>' +
      '<figure class="vh-lightbox-figure">' +
      '<img class="vh-lightbox-image" alt="">' +
      '<figcaption class="vh-lightbox-caption"></figcaption>' +
      '</figure>' +
      '<button type="button" class="vh-lightbox-nav" data-direction="next" aria-label="下一张">&gt;</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(lightbox);

    const lightboxImage = lightbox.querySelector('.vh-lightbox-image');
    const lightboxCaption = lightbox.querySelector('.vh-lightbox-caption');
    const lightboxClose = lightbox.querySelector('.vh-lightbox-close');
    const previousButton = lightbox.querySelector('.vh-lightbox-nav[data-direction="prev"]');
    const nextButton = lightbox.querySelector('.vh-lightbox-nav[data-direction="next"]');

    let currentGallery = [];
    let currentIndex = 0;
    let hideTimer = 0;
    let lastActiveElement = null;

    const getGalleryItems = (trigger) => {
      const group = String(trigger.getAttribute('data-vh-lightbox-group') || '');
      if (!group) {
        return [trigger];
      }
      return lightboxTriggers.filter(
        (item) => item instanceof HTMLElement && item.getAttribute('data-vh-lightbox-group') === group,
      );
    };

    const syncLightbox = () => {
      const activeButton = currentGallery[currentIndex];
      if (
        !(activeButton instanceof HTMLElement) ||
        !(lightboxImage instanceof HTMLImageElement) ||
        !(lightboxCaption instanceof HTMLElement) ||
        !(previousButton instanceof HTMLButtonElement) ||
        !(nextButton instanceof HTMLButtonElement)
      ) {
        return;
      }

      const src = String(activeButton.getAttribute('data-vh-lightbox-src') || '');
      const alt = String(activeButton.getAttribute('data-vh-lightbox-alt') || '');
      lightboxImage.setAttribute('src', src);
      lightboxImage.setAttribute('alt', alt);

      const countLabel =
        currentGallery.length > 1 ? String(currentIndex + 1) + ' / ' + String(currentGallery.length) : '';
      lightboxCaption.textContent = [countLabel, alt].filter(Boolean).join(' · ');
      previousButton.disabled = currentGallery.length <= 1;
      nextButton.disabled = currentGallery.length <= 1;
    };

    const showLightboxItem = (nextIndex) => {
      if (!currentGallery.length) {
        return;
      }
      const total = currentGallery.length;
      currentIndex = ((nextIndex % total) + total) % total;
      syncLightbox();
    };

    const openLightbox = (button) => {
      if (!(button instanceof HTMLElement)) {
        return;
      }

      const src = String(button.getAttribute('data-vh-lightbox-src') || '');
      if (!src) {
        return;
      }

      currentGallery = getGalleryItems(button);
      currentIndex = Math.max(currentGallery.indexOf(button), 0);
      lastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (hideTimer) {
        window.clearTimeout(hideTimer);
        hideTimer = 0;
      }

      syncLightbox();
      lightbox.removeAttribute('hidden');
      document.body.classList.add('vh-lightbox-open');
      window.requestAnimationFrame(() => {
        lightbox.classList.add('active');
      });
      if (lightboxClose instanceof HTMLButtonElement) {
        lightboxClose.focus({ preventScroll: true });
      }
    };

    closeLightbox = () => {
      if (lightbox.hasAttribute('hidden')) {
        return;
      }

      lightbox.classList.remove('active');
      document.body.classList.remove('vh-lightbox-open');
      hideTimer = window.setTimeout(() => {
        lightbox.setAttribute('hidden', '');
        if (lightboxImage instanceof HTMLImageElement) {
          lightboxImage.removeAttribute('src');
        }
        hideTimer = 0;
      }, 200);

      if (lastActiveElement instanceof HTMLElement && lastActiveElement.isConnected) {
        window.setTimeout(() => {
          lastActiveElement.focus({ preventScroll: true });
        }, 0);
      }
    };

    showPreviousLightboxItem = () => {
      showLightboxItem(currentIndex - 1);
    };

    showNextLightboxItem = () => {
      showLightboxItem(currentIndex + 1);
    };

    isLightboxOpen = () => lightbox.classList.contains('active');

    lightboxTriggers.forEach((button) => {
      if (!(button instanceof HTMLElement)) {
        return;
      }

      button.addEventListener('click', (event) => {
        event.preventDefault();
        openLightbox(button);
      });

      if (!(button instanceof HTMLAnchorElement) && !(button instanceof HTMLButtonElement)) {
        button.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') {
            return;
          }
          event.preventDefault();
          openLightbox(button);
        });
      }
    });

    if (lightboxClose instanceof HTMLButtonElement) {
      lightboxClose.addEventListener('click', closeLightbox);
    }

    if (previousButton instanceof HTMLButtonElement) {
      previousButton.addEventListener('click', showPreviousLightboxItem);
    }

    if (nextButton instanceof HTMLButtonElement) {
      nextButton.addEventListener('click', showNextLightboxItem);
    }

    lightbox.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.closest('.vh-lightbox-figure') || target.closest('.vh-lightbox-nav') || target.closest('.vh-lightbox-close')) {
        return;
      }
      closeLightbox();
    });
  }

  const codeBlocks = Array.from(document.querySelectorAll('article.vh-article-main > main pre'));
  codeBlocks.forEach((block) => {
    if (!(block instanceof HTMLElement)) {
      return;
    }

    const code = block.querySelector('code');
    const className = code?.className || '';
    const match = className.match(/language-([a-z0-9+#_-]+)/i) || className.match(/lang-([a-z0-9+#_-]+)/i);
    block.dataset.codeLang = match?.[1] || 'code';

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'code-copy-button';
    copyButton.textContent = '复制';
    copyButton.addEventListener('click', async () => {
      const text = code?.textContent || block.textContent || '';
      if (!text.trim()) {
        return;
      }

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.setAttribute('readonly', '');
          textarea.style.position = 'absolute';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          textarea.remove();
        }

        copyButton.textContent = '已复制';
        copyButton.classList.add('is-copied');
        window.setTimeout(() => {
          copyButton.textContent = '复制';
          copyButton.classList.remove('is-copied');
        }, 1400);
      } catch (error) {
        console.error('copy failed', error);
      }
    });
    block.appendChild(copyButton);
  });

  const filterSearchList = () => {
    if (!(searchInput instanceof HTMLInputElement)) {
      return;
    }
    const keyword = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    searchItems.forEach((item) => {
      const matched = !keyword || item.textContent.toLowerCase().includes(keyword);
      item.style.display = matched ? '' : 'none';
      if (matched) {
        visibleCount += 1;
      }
    });

    if (searchHint) {
      if (!keyword) {
        searchHint.textContent = '输入关键词后按回车搜索全部文章';
        searchHint.style.display = searchItems.length ? 'none' : '';
        return;
      }

      if (visibleCount) {
        searchHint.style.display = 'none';
        return;
      }

      searchHint.textContent = '没有本地匹配，按回车搜索全部文章';
      searchHint.style.display = '';
    }
  };

  if (searchButton) {
    searchButton.addEventListener('click', openSearch);
  }

  if (search) {
    search.addEventListener('click', (event) => {
      if (event.target === search) {
        closeSearch();
      }
    });
  }

  if (searchInput instanceof HTMLInputElement) {
    searchInput.addEventListener('input', filterSearchList);
  }

  if (searchForm instanceof HTMLFormElement) {
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!(searchInput instanceof HTMLInputElement)) {
        return;
      }
      const keyword = searchInput.value.trim();
      if (!keyword) {
        return;
      }
      window.location.href = '/archives?q=' + encodeURIComponent(keyword);
    });
  }

  if (menuButton) {
    menuButton.addEventListener('click', toggleSidebar);
  }

  if (mobileSidebar) {
    mobileSidebar.addEventListener('click', (event) => {
      if (event.target === mobileSidebar) {
        closeSidebar();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (isLightboxOpen()) {
      if (event.key === 'Escape') {
        closeLightbox();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showPreviousLightboxItem();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        showNextLightboxItem();
        return;
      }
    }

    if (event.key === 'Escape') {
      closeSearch();
      closeSidebar();
    }
  });

  if (backTop) {
    backTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  syncBackTop();
  window.addEventListener('scroll', syncBackTop, { passive: true });

  if (typewriteTarget instanceof HTMLElement) {
    let messages = [];
    try {
      messages = JSON.parse(typewriteTarget.dataset.typewrite || '[]');
    } catch {
      messages = [];
    }

    if (!Array.isArray(messages) || !messages.length) {
      typewriteTarget.textContent = typewriteTarget.dataset.fallback || '';
    } else {
      let messageIndex = 0;
      let characterIndex = 0;
      let deleting = false;

      const step = () => {
        const current = String(messages[messageIndex] || '');
        if (!deleting) {
          characterIndex += 1;
        } else {
          characterIndex -= 1;
        }

        typewriteTarget.textContent = current.slice(0, characterIndex);

        if (!deleting && characterIndex >= current.length) {
          deleting = true;
          window.setTimeout(step, 1500);
          return;
        }

        if (deleting && characterIndex <= 0) {
          deleting = false;
          messageIndex = (messageIndex + 1) % messages.length;
        }

        window.setTimeout(step, deleting ? 42 : 88);
      };

      step();
    }
  }

  const commentForms = Array.from(document.querySelectorAll('[data-comment-form]'));
  commentForms.forEach((commentForm) => {
    if (!(commentForm instanceof HTMLFormElement)) {
      return;
    }

    const formId = commentForm.id;
    const status = commentForm.querySelector('[data-comment-status]');
    const parentInput = commentForm.querySelector('[data-comment-parent]');
    const replyMeta = commentForm.querySelector('[data-comment-reply-meta]');
    const replyText = commentForm.querySelector('[data-comment-reply-text]');
    const replyCancel = commentForm.querySelector('[data-comment-reply-cancel]');
    const replyButtons = Array.from(
      document.querySelectorAll('[data-comment-reply][data-comment-form-target="' + formId + '"]'),
    );
    const commentTextarea = commentForm.querySelector('textarea[name="content"]');

    const resetReplyState = () => {
      if (parentInput instanceof HTMLInputElement) {
        parentInput.value = '0';
      }
      if (replyMeta instanceof HTMLElement) {
        replyMeta.classList.add('is-hidden');
      }
      if (replyText instanceof HTMLElement) {
        replyText.textContent = '正在回复';
      }
    };

    replyButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const commentId = String(button.getAttribute('data-comment-id') || '0');
        const author = String(button.getAttribute('data-comment-author') || '该评论');
        const momentId = String(commentForm.dataset.momentId || '');

        if (parentInput instanceof HTMLInputElement) {
          parentInput.value = commentId;
        }
        if (replyText instanceof HTMLElement) {
          replyText.textContent = '回复 @' + author;
        }
        if (replyMeta instanceof HTMLElement) {
          replyMeta.classList.remove('is-hidden');
        }

        if (momentId) {
          openMomentInteractions(momentId);
        }

        commentForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => {
          if (commentTextarea instanceof HTMLTextAreaElement) {
            commentTextarea.focus();
          }
        }, 220);
      });
    });

    if (replyCancel instanceof HTMLButtonElement) {
      replyCancel.addEventListener('click', resetReplyState);
    }

    commentForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(commentForm);
      const kind = String(commentForm.dataset.commentKind || 'post');
      const postId = Number(commentForm.dataset.postId || '0');
      const momentId = Number(commentForm.dataset.momentId || '0');
      const parentId = Number(formData.get('parent') || '0');
      const payload = {
        parent: parentId || undefined,
        author_name: String(formData.get('author_name') || '').trim(),
        author_email: String(formData.get('author_email') || '').trim(),
        author_url: String(formData.get('author_url') || '').trim(),
        content: String(formData.get('content') || '').trim(),
      };

      if (!payload.content) {
        if (status) {
          status.textContent = '评论内容不能为空。';
          status.dataset.state = 'error';
        }
        return;
      }

      const endpoint =
        kind === 'moment'
          ? '/wp-json/wp/v2/moments/' + momentId + '/comments'
          : '/wp-json/wp/v2/comments';
      const requestBody =
        kind === 'moment'
          ? payload
          : {
              post: postId,
              ...payload,
            };

      if (kind === 'post' && !postId) {
        if (status) {
          status.textContent = '缺少文章 ID。';
          status.dataset.state = 'error';
        }
        return;
      }

      if (kind === 'moment' && !momentId) {
        if (status) {
          status.textContent = '缺少动态 ID。';
          status.dataset.state = 'error';
        }
        return;
      }

      if (status) {
        status.textContent = '正在提交评论...';
        status.dataset.state = '';
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || '评论提交失败，请稍后重试。');
        }

        commentForm.reset();
        resetReplyState();
        if (status) {
          status.textContent = '评论已发布，页面即将刷新。';
          status.dataset.state = 'success';
        }
        window.setTimeout(() => window.location.reload(), 900);
      } catch (error) {
        if (status) {
          status.textContent = error instanceof Error ? error.message : '评论提交失败，请稍后重试。';
          status.dataset.state = 'error';
        }
      }
    });
  });

  const likedMomentKey = 'cfblog-liked-moments';
  const likedMomentIds = new Set(
    (() => {
      try {
        const parsed = JSON.parse(localStorage.getItem(likedMomentKey) || '[]');
        return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
      } catch {
        return [];
      }
    })(),
  );

  const persistLikedMoments = () => {
    localStorage.setItem(likedMomentKey, JSON.stringify([...likedMomentIds]));
  };

  const likeButtons = Array.from(document.querySelectorAll('[data-moment-like]'));
  likeButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const momentId = String(button.dataset.momentId || '');
    const countNode = button.querySelector('[data-moment-like-count]');

    const syncButton = () => {
      const liked = likedMomentIds.has(momentId);
      button.classList.toggle('is-liked', liked);
      button.dataset.liked = liked ? 'true' : 'false';
    };

    syncButton();

    button.addEventListener('click', async () => {
      if (!momentId || button.dataset.pending === 'true') {
        return;
      }

      const liked = likedMomentIds.has(momentId);
      button.dataset.pending = 'true';

      try {
        const response = await fetch('/wp-json/wp/v2/moments/' + momentId + '/like', {
          method: liked ? 'DELETE' : 'POST',
        });

        if (!response.ok) {
          throw new Error('点赞失败，请稍后重试。');
        }

        const data = await response.json();
        if (liked) {
          likedMomentIds.delete(momentId);
        } else {
          likedMomentIds.add(momentId);
        }
        persistLikedMoments();
        syncButton();

        if (countNode instanceof HTMLElement) {
          countNode.textContent = String(data.like_count || 0);
        }
      } catch (error) {
        console.error(error);
      } finally {
        delete button.dataset.pending;
      }
    });
  });
})();`;
