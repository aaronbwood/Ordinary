import { useEffect } from 'react';
import { match, useHashPath } from './router';
import { courses } from './content/loader';
import { progress, useSettings } from './state/progress';
import { Icon } from './components/icons';
import { Home } from './pages/Home';
import { CourseMap } from './pages/CourseMap';
import { LessonView } from './pages/LessonView';
import { PracticeView } from './pages/PracticeView';
import { ReviewView } from './pages/ReviewView';
import { RhythmView } from './pages/RhythmView';
import { ApartmentView } from './pages/ApartmentView';
import { DrillsView } from './pages/DrillsView';
import { ComicView } from './pages/ComicView';
import { ComicsView } from './pages/ComicsView';
import { VocabView } from './pages/VocabView';
import { ListenView } from './pages/ListenView';
import { SettingsView } from './pages/SettingsView';

export const DEFAULT_COURSE = 'abv-vol1';

export function App() {
  const path = useHashPath();
  const s = useSettings();
  useEffect(() => {
    document.documentElement.style.setProperty('--ar-size', `${s.arabicSize}rem`);
  }, [s.arabicSize]);

  const courseParam = path.match(/^\/c\/([^/]+)/)?.[1] ?? DEFAULT_COURSE;
  useEffect(() => {
    if (path.startsWith('/c/') && courses.some((c) => c.id === courseParam)) progress.setPath(courseParam, path);
  }, [path, courseParam]);

  let page: JSX.Element;
  let m: Record<string, string> | null;
  if ((m = match('/c/:course/l/:lesson/comic/:comic', path))) page = <ComicView courseId={m.course} lessonId={m.lesson} comicId={m.comic} />;
  else if ((m = match('/c/:course/l/:lesson/scene/:scene', path))) page = <ApartmentView courseId={m.course} lessonId={m.lesson} blockId={m.scene} />;
  else if ((m = match('/c/:course/l/:lesson/x/:ex', path))) page = <PracticeView courseId={m.course} lessonId={m.lesson} exerciseId={m.ex} />;
  else if ((m = match('/c/:course/l/:lesson', path))) page = <LessonView courseId={m.course} lessonId={m.lesson} />;
  else if ((m = match('/c/:course/review', path))) page = <ReviewView courseId={m.course} />;
  else if ((m = match('/c/:course/rhythm', path))) page = <RhythmView key={window.location.hash} courseId={m.course} />;
  else if ((m = match('/c/:course/comics', path))) page = <ComicsView courseId={m.course} />;
  else if ((m = match('/c/:course/words', path))) page = <VocabView courseId={m.course} />;
  else if ((m = match('/c/:course/listen', path))) page = <ListenView courseId={m.course} />;
  else if ((m = match('/c/:course/drills', path))) page = <DrillsView courseId={m.course} />;
  else if ((m = match('/c/:course', path))) page = <CourseMap courseId={m.course} />;
  else if (path === '/settings') page = <SettingsView />;
  else page = <Home />;

  const tab = path === '/' || path.includes('/listen') ? 'home' : path.includes('/review') ? 'review' : path.includes('/rhythm') ? 'rhythm' : path.includes('/comic') ? 'comics' : path.includes('/words') ? 'words' : path.includes('/drills') || path.includes('/x/') ? 'drills' : path === '/settings' ? 'settings' : 'study';
  const c = courseParam;
  const nav = [
    { id: 'home', href: '#/', label: 'Home', icon: 'home' },
    { id: 'study', href: `#/c/${c}`, label: 'Lessons', icon: 'book' },
    { id: 'words', href: `#/c/${c}/words`, label: 'Words', icon: 'words' },
    { id: 'drills', href: `#/c/${c}/drills`, label: 'Drills', icon: 'mic' },
    { id: 'comics', href: `#/c/${c}/comics`, label: 'Comics', icon: 'comic' },
    { id: 'rhythm', href: `#/c/${c}/rhythm`, label: 'Rhythm', icon: 'metronome' },
    { id: 'review', href: `#/c/${c}/review`, label: 'Review', icon: 'review' },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/">
          <span>Ordinary Day Arabic</span>
        </a>
        <span className="spacer" />
        <nav className="desk-nav" aria-label="Main">
          {nav.map((n) => (
            <a key={n.id} href={n.href} className={tab === n.id ? 'active' : ''}>{n.label}</a>
          ))}
        </nav>
        <a className="btn small icon ghost" href="#/settings" aria-label="Settings"><Icon name="settings" /></a>
      </header>
      <main className="page">{page}</main>
      <nav className="bottomnav" aria-label="Main">
        {nav.map((n) => (
          <a key={n.id} href={n.href} className={tab === n.id ? 'active' : ''} aria-current={tab === n.id ? 'page' : undefined}>
            <Icon name={n.icon} />
            {n.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
