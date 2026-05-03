import { type ReactNode } from "react";

/** Passthrough kept for backwards compatibility — wrapper div removed for perf. */
const PageTransition = ({ children }: { children: ReactNode }) => <>{children}</>;

export default PageTransition;
