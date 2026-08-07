import type { Metadata } from "next";

/**
 * Kargo inteqrasiyası üçün sənəd səhifəsi — kargo şirkətinə bu linki veririk.
 *
 * Swagger UI CDN-dən yüklənir, yerli asılılıq əlavə etmirik (layihəyə ağır
 * paket qoşmamaq üçün). CDN əlçatan olmasa da xam JSON linki işləyir —
 * səhifədə açıq göstərilir ki, inteqrator hər halda sənədi əldə edə bilsin.
 */
export const metadata: Metadata = {
  title: "E-Commerce — Kargo İnteqrasiyası",
  // Texniki sənəddir, axtarışda indekslənməsinə ehtiyac yoxdur.
  robots: { index: false, follow: false },
};

const SWAGGER_VERSION = "5.17.14";

export default function CargoDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900">
          E-Commerce — Kargo İnteqrasiyası
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Xam sənəd:{" "}
          <a
            href="/api/cargo/openapi.json"
            className="font-mono text-blue-700 underline"
          >
            /api/cargo/openapi.json
          </a>
        </p>
      </div>

      <link
        rel="stylesheet"
        href={`https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css`}
      />
      <div id="swagger-ui" />
      <script
        src={`https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js`}
        defer
      />
      <script
        // Swagger UI CDN-dən gələndən sonra qoşulur.
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', function () {
              if (!window.SwaggerUIBundle) return;
              window.SwaggerUIBundle({
                url: '/api/cargo/openapi.json',
                dom_id: '#swagger-ui',
                docExpansion: 'list',
                defaultModelsExpandDepth: 1,
              });
            });
          `,
        }}
      />
    </div>
  );
}
