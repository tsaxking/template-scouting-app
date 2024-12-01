if [ ! -f ".env" ]; then
	echo "No .env file found, using template."
	cp .devcontainer/env.template .env
fi

echo "Installing dependencies..."
npm i