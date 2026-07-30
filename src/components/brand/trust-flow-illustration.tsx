export function TrustFlowIllustration() {
  return (
    <figure className="trust-flow">
      <svg
        aria-labelledby="trust-flow-title trust-flow-description"
        className="trust-flow__art"
        role="img"
        viewBox="0 0 640 420"
      >
        <title id="trust-flow-title">Perjalanan amanah yang terhubung</title>
        <desc id="trust-flow-description">
          Alur dari pemberi amanah, pengelola, mitra penyalur, hingga penerima
          manfaat dengan titik verifikasi di setiap tahap.
        </desc>
        <path
          className="trust-flow__route trust-flow__route--primary"
          d="M92 92 C210 54 240 182 326 180 S470 82 548 112"
        />
        <path
          className="trust-flow__route trust-flow__route--secondary"
          d="M92 92 C122 248 240 314 326 180 S486 254 548 322"
        />
        <path
          className="trust-flow__route trust-flow__route--quiet"
          d="M92 92 C240 76 404 240 548 322"
        />

        <g className="trust-flow__node trust-flow__node--source">
          <circle cx="92" cy="92" r="32" />
          <text x="92" y="151" textAnchor="middle">
            Pemberi amanah
          </text>
        </g>
        <g className="trust-flow__node trust-flow__node--center">
          <circle cx="326" cy="180" r="40" />
          <text x="326" y="244" textAnchor="middle">
            Pengelola
          </text>
        </g>
        <g className="trust-flow__node trust-flow__node--partner">
          <circle cx="548" cy="112" r="30" />
          <text x="548" y="169" textAnchor="middle">
            Mitra penyalur
          </text>
        </g>
        <g className="trust-flow__node trust-flow__node--beneficiary">
          <circle cx="548" cy="322" r="34" />
          <text x="548" y="383" textAnchor="middle">
            Penerima manfaat
          </text>
        </g>

        <g className="trust-flow__checkpoint">
          <circle cx="208" cy="120" r="8" />
          <circle cx="425" cy="139" r="8" />
          <circle cx="432" cy="257" r="8" />
        </g>
      </svg>
      <figcaption>
        Setiap perpindahan tercatat, diverifikasi, dan dapat ditinjau kembali.
      </figcaption>
    </figure>
  );
}
