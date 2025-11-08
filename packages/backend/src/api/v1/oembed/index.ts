import type {FastifyInstance, FastifyPluginOptions} from 'fastify';
import {z} from 'zod';

const oembedQuerySchema = z.object({
  author: z.string().optional(),
});

export default function oembedRouter(app: FastifyInstance, _options: FastifyPluginOptions) {
  // GET /api/v1/oembed - oEmbed endpoint
  app.get<{
    Querystring: z.infer<typeof oembedQuerySchema>;
  }>('/', async (request, reply) => {
    const validated = oembedQuerySchema.parse(request.query);

    // https://oembed.com/#section2.3
    const response: {
      type: string;
      version: string;
      author_name?: string;
    } = {
      type: 'link',
      version: '1.0',
    };

    if (validated.author) {
      response.author_name = validated.author;
    }

    return reply.send(response);
  });
}
