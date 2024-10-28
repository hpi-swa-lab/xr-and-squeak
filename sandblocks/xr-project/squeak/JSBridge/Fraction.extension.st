Extension { #name : #Fraction }

{ #category : #'*JSBridge-Core' }
Fraction >> asJSArgument [

	^ self asFloat asJSArgument
]
