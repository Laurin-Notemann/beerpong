if npm run build:ios:local gives this error:

Fastlane is not available, make sure it's installed and in your PATH

you'll want to run sudo gem install fastlane -NV

put export PATH="$HOME/.fastlane/bin:$PATH" in the bottom of your .zshrc

install xcode command line tools

you may also need to run xcode-select --install to install
