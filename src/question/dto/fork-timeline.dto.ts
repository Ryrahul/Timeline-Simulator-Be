import { z } from 'zod';

export const forkTimelineSchema = z.object({
  parentTimelineId: z
    .string()
    .min(1, { message: 'parentTimelineId is required' }),

  newText: z
    .string()
    .min(3, { message: 'newText must be at least 3 characters' }),
});

export type ForkTimelineDto = z.infer<typeof forkTimelineSchema>;
