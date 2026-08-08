import { useNavigate } from 'react-router-dom';
import { Footer } from '../../components/Footer';
import { SocialLinks } from '../../primitives/SocialLinks';
import { Flourish } from '../../primitives/Flourish';
import { useArtists } from '../../hooks/artists';
import { useLiveJam } from '../../hooks/collections';
import { PublicJamCard } from './PublicJamCard';
import { Testimonials } from './Testimonials';
import { PROJECT_SOCIALS } from '../../config/socials';

export default function AboutPage() {
  const navigate = useNavigate();
  const { artists } = useArtists();
  // Whichever artist is hosting is the one we show. Until the backend can
  // answer "which jam is live right now" across the roster, that's the first
  // artist's — the same one the featured card used to pick, and correct while
  // one jam runs at a time.
  const host = artists[0];
  const { jam, refetch } = useLiveJam(host?.artist_id ?? '');

  return (
    <div className="flex flex-col gap-xl py-lg">
      {/* Banner — sets the mood, edge-to-edge of the 430px column */}
      <img src="/Branding/banner_wide.png" alt="SlopBop" className="w-full" />

      {/* The concept — who we are, and how the name works. No business here. */}
      <section className="flex flex-col gap-md px-md">
        <p className="text-base leading-relaxed">
          SlopBop is an <span className="highlight">agentic music label</span> with a cast of
          synthetic artists. They create songs, and you judge them.
        </p>

        {/* The thesis, stated as a bet — confident about the wager, silent on
            the outcome. Declaring that our music bops would answer the exact
            question the line above hands to the reader, and a verdict the label
            already announced isn't worth handing out. */}
        <p className="text-base leading-relaxed">
          Anyone can prompt a song. We're betting it can only <span className="highlight">bop</span>{' '}
          when there's an artist behind it, with its own personality, voice and taste.
        </p>

        {/* Socials, lifted up right under the introduction */}
        <SocialLinks socials={PROJECT_SOCIALS} className="justify-center pt-sm" />
      </section>

      {/* Public Jams — the one thing on this page a visitor can act on today,
          which is why it outranks the commission teaser below it. It replaced a
          featured artist card: featuring someone only pays off when there's
          something of theirs to do, and a portrait with a name under it isn't
          that. No "view all" button beneath it, for the reason the featured
          card never had one either — it out-competes the card for the tap, and
          Roster is a permanent nav tab anyway.

          The sentence stands whether or not a jam is running; the card is the
          part that needs one. Between jams the offer is still worth stating —
          it's a weekly thing, and "come back" is a real message. */}
      <section className="flex flex-col gap-md px-md">
        <h2 className="font-display text-2xl">Public Jams</h2>
        <p className="text-base leading-relaxed">
          Each week, we host a <span className="highlight">public jam</span> featuring one of our
          signed artists, who produces the songs you write.
        </p>
        {jam && <PublicJamCard jam={jam} onExpire={refetch} />}
      </section>

      <Flourish />

      {/* Commission teaser — full detail lives on /commission. A teaser, not a
          summary: it names the offer and the payoff, and deliberately withholds
          the mechanic (the release schedule, the voting, what the day asks of
          you). Answering all of that here is what makes a "Learn more" button
          pointless — there has to be something left to learn. Ends on the video
          because that's the line that earns the tap. */}
      <section className="flex flex-col gap-md px-md">
        <div className="flex flex-col gap-xs">
          <p className="eyebrow">Introducing</p>
          <h2 className="font-display text-2xl">Mixtape Commissions</h2>
        </div>
        <p className="text-base leading-relaxed">
          Rent one of our artists for your group's next day out - a birthday, an offsite, a
          hackathon. Everyone writes lyrics, the artist records them, and by the evening there's an{' '}
          <span className="highlight">mixtape</span> as an artifact of your special day.
        </p>
        <p className="text-base leading-relaxed">
          The group's favourite song gets a music video on our channels.
        </p>

        <div className="flex justify-end pt-sm">
          <button
            type="button"
            className="secondary"
            onClick={() => navigate('/commission')}
          >
            Learn more
          </button>
        </div>
      </section>

      {/* Real testimonials — renders nothing until quotes are added */}
      <Testimonials />

      <div className="px-md">
        <Footer />
      </div>
    </div>
  );
}
