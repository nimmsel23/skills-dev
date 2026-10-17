import { useState } from 'react';
import exerciseVideos from './exerciseVideos.json';

export function videoForExercise(name) {
  const video = exerciseVideos[name];
  if (!video) return null;
  if (video.kind === 'demo') {
    try { return new URL(video.url).protocol === 'https:' ? video : null; } catch { return null; }
  }
  return /^[\w-]{11}$/.test(video.youtubeId || '') ? video : null;
}

// Key by exercise name: switching blocks closes the previous player.
export default function ExerciseVideo({ name, autoPlay = false }) {
  const video = videoForExercise(name);
  const [playing, setPlaying] = useState(() => autoPlay && video?.kind === 'demo');
  const [failed, setFailed] = useState(false);
  if (!video) return <p className="text-sm" style={{ color: 'var(--dim)' }}>Für {name} ist noch kein Video hinterlegt.</p>;
  const original = video.source || `https://www.youtube.com/watch?v=${video.youtubeId}`;
  const tutorial = video.kind === 'demo' ? video.tutorial : null;
  return (
    <section className="my-3 text-left" aria-label={`Video: ${name}`}>
      <div className="text-xs font-bold mb-2" style={{ color: 'var(--ink)' }}>{name} · {video.kind === 'demo' ? 'Demo-Loop' : 'Skill-Tutorial'}</div>
      {failed ? <p className="text-sm" style={{ color: 'var(--dim)' }}>Video konnte nicht geladen werden. Bitte die Originalquelle öffnen.</p> : playing ? video.kind === 'demo' ? <video
        src={video.url} autoPlay muted loop playsInline controls preload="metadata"
        className="w-full aspect-video rounded-xl bg-black object-contain" onError={() => setFailed(true)}
      /> : <iframe
        src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0&playsinline=1&mute=1&loop=1&playlist=${video.youtubeId}${video.startSeconds ? `&start=${video.startSeconds}` : ''}`}
        title={`Übungsvideo: ${name}`} className="w-full aspect-video rounded-xl border-0 bg-black"
        allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen
      /> : <button type="button" onClick={() => setPlaying(true)} className="w-full min-h-16 rounded-xl p-4 text-sm font-bold" style={{ background: 'var(--bg2)', border: '1px solid var(--line)', color: 'var(--accent)' }}>
        Video laden: {name}
      </button>}
      <p className="text-xs mt-2" style={{ color: 'var(--dim)' }}>{video.note || video.title}</p>
      <a href={original} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: 'var(--dim)' }}>Original · {video.author}</a>
      {tutorial && <a href={`https://www.youtube.com/watch?v=${tutorial.youtubeId}`} target="_blank" rel="noopener noreferrer" className="ml-3 text-xs underline" style={{ color: 'var(--dim)' }}>Skill-Tutorial · {tutorial.author}</a>}
    </section>
  );
}
