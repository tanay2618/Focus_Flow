import { EmptyState, LinkButton } from '../components/Feedback.jsx';

export default function NotFound() {
  return (
    <div className="container page">
      <EmptyState title="Page not found" description="That address does not lead anywhere in Focus Flow."
        action={<LinkButton to="/">Back to dashboard</LinkButton>} />
    </div>
  );
}
