import { PageHero } from '../components/Sections.jsx';
import { Btn } from '../components/Buttons.jsx';
import Seo from '../components/Seo.jsx';

export default function NotFound() {
  return (
    <>
      <Seo title="Page not found" noindex />
      <PageHero eyebrow="404" title="This page has wandered out of frame" text="The page you’re looking for doesn’t exist or has moved.">
        <div className="page-hero__actions"><Btn to="/">Back to home</Btn><Btn to="/portfolio" variant="outline">View portfolio</Btn></div>
      </PageHero>
    </>
  );
}
