import type { LoggedSet } from '@/lib/types';
import { liftedVolume, volumeBuckets } from '@/lib/activity';

export default function VolumeChart({ logs, now, days, label }: { logs: LoggedSet[]; now: Date; days: number; label: string }) {
  const buckets = volumeBuckets(logs, now, days);
  const max = Math.max(...buckets.map(bucket => bucket.pounds), 1);
  const total = liftedVolume(logs);
  return <section className="progress-card volume-chart" aria-label="Lifting volume chart">
    <div className="progress-card-heading"><h2>Volume lifted</h2><span>{label}</span></div>
    <p className="progress-total">{total.toLocaleString()} <small>lb total</small></p>
    <div className="volume-plot" role="img" aria-label={total.toLocaleString() + ' pounds lifted during ' + label.toLowerCase() + '. ' + buckets.filter(bucket => bucket.pounds > 0).map(bucket => bucket.label + ': ' + bucket.pounds.toLocaleString() + ' lb').join('; ')}>
      <div className="volume-grid" aria-hidden="true"><i/><i/><i/></div><span className="volume-max" aria-hidden="true">{total > 0 ? max.toLocaleString() + ' lb' : 'No volume yet'}</span>
      <div className="volume-bars" aria-hidden="true">{buckets.map(bucket => <div className="volume-column" key={bucket.key}><div className="volume-bar-track"><div className="volume-bar" style={{ transform: 'scaleY(' + bucket.pounds / max + ')' }}/></div><span>{bucket.label}</span></div>)}</div>
    </div>
    {logs.length === 0 && <p className="progress-empty-note">Log a set to start building your progress.</p>}
    <details className="volume-data"><summary>View volume data</summary><table><thead><tr><th>From</th><th>Through</th><th>Volume</th></tr></thead><tbody>{buckets.map(bucket => <tr key={bucket.key}><td>{bucket.from.toLocaleDateString()}</td><td>{new Date(Math.min(new Date(bucket.end.getFullYear(), bucket.end.getMonth(), bucket.end.getDate() - 1).getTime(), now.getTime())).toLocaleDateString()}</td><td>{bucket.pounds.toLocaleString()} lb</td></tr>)}</tbody></table></details>
  </section>;
}
