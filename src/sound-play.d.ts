declare module "sound-play" {
  const soundPlay: {
    play(filePath: string): Promise<void>;
  };

  export default soundPlay;
}
