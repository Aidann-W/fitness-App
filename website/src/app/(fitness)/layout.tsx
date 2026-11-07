import WorkoutProvider from '../dashboard/WorkoutProvider';
export default function FitnessLayout({ children }: {
    children: React.ReactNode;
}) { return <WorkoutProvider>{children}</WorkoutProvider>; }
