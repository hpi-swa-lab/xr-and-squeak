Extension { #name : #Vector2 }

{ #category : #'*SqueakXR-helpers' }
Vector2 >> *= anObject [

	^ anObject isPoint
		ifTrue: [^ self * anObject asVector]
		ifFalse: [^ super *= anObject]
]

{ #category : #'*SqueakXR-helpers' }
Vector2 >> adaptToPoint: rcvr andSend: selector [

	rcvr perform: selector with: self x @ self y
]

{ #category : #'*SqueakXR-helpers' }
Vector2 class >> componentSelectors [

	^ #(x y)
]
