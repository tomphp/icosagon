{
  description = "Icosagon: a two-player line-drawing game";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAll = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in {
      devShells = forAll (pkgs: {
        default = pkgs.mkShell {
          packages = [ pkgs.nodejs_22 pkgs.chromium ];
          PUPPETEER_SKIP_DOWNLOAD = "1";
          PUPPETEER_EXECUTABLE_PATH = "${pkgs.chromium}/bin/chromium";
        };
      });
    };
}
