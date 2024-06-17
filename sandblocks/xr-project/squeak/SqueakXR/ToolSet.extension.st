Extension { #name : #ToolSet }

{ #category : #'*SqueakXR-error handling' }
ToolSet class >> doWithDefaultErrorHandling: aBlock [

	^ aBlock
		on: Exception
		do: [:exception | self handleError: exception]
]
