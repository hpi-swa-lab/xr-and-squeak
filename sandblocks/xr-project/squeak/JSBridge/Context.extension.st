Extension { #name : #Context }

{ #category : #'*JSBridge-Core' }
Context >> isInClosure: aClosure [

	(self closure notNil and: [self closure = aClosure])
		ifTrue: [^ true].
	
	self sender ifNil: [^ false].
	
	^ self sender isInClosure: aClosure
]
