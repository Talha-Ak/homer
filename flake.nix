{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    systems.url = "github:nix-systems/default";
  };

  outputs = {
    nixpkgs,
    systems,
    ...
  }: let
    forAllSystems = f:
      nixpkgs.lib.genAttrs (import systems) (system: f nixpkgs.legacyPackages.${system});
  in {
    devShells = forAllSystems (pkgs: {
      default = pkgs.mkShell {
        buildInputs = [
          pkgs.nodejs_24
          pkgs.nodePackages.pnpm
          pkgs.nodePackages.typescript-language-server
          pkgs.luajit
          pkgs.go
        ];
        shellHook = ''
          export LIBRARY_PATH="${pkgs.luajit}/lib:$LIBRARY_PATH"
        '';
      };
    });
  };
}
