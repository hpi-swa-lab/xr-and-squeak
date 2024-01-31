as yet unclassified
start

	server := WebServer new
		listenOn: 9824;
		addService: '/source' action: (MessageSend receiver: self selector: #handleSource:);
		errorHandler: [:err :request | ToolSet debugException: err]