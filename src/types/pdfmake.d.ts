// The pdfmake default Roboto font descriptor has no bundled type declaration.
// It exports a TFontDictionary with absolute TTF paths (Roboto, full Cyrillic).
declare module 'pdfmake/fonts/Roboto.js' {
  const fonts: import('pdfmake/interfaces').TFontDictionary;
  export default fonts;
}
