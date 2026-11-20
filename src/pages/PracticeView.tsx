import { useEffect } from 'react';
import { exercisesOf, findLesson, getCourse } from '../content/loader';
import { progress } from '../state/progress';
import { ExercisePlayer } from '../components/ExercisePlayer';

export function PracticeView({ courseId, lessonId, exerciseId }: { courseId: string; lessonId: string; exerciseId: string }) {
  const course = getCourse(courseId);
  const ref = course && findLesson(course, lessonId);
  const ex = ref && exercisesOf(ref.lesson).find((e) => e.id === exerciseId);
  useEffect(() => {
    if (ex) progress.visit(courseId, lessonId, `/c/${courseId}/l/${lessonId}/x/${exerciseId}`);
  }, [courseId, lessonId, exerciseId, !!ex]);
  if (!ex || !ref) return <div className="notice">Exercise not found.</div>;
  return (
    <div className="stack">
      <a className="small" href={`#/c/${courseId}/l/${lessonId}`}>← {ref.lesson.code ? `${ref.lesson.code} ` : ''}{ref.lesson.title}</a>
      <ExercisePlayer courseId={courseId} lessonId={lessonId} exercise={ex} />
    </div>
  );
}
