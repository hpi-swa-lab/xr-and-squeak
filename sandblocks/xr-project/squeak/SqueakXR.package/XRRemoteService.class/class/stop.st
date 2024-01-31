as yet unclassified
stop

	CurrentService ifNotNil: [
		CurrentService stop.
		CurrentService := nil]