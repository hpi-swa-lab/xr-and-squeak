Extension { #name : #TranscriptStream }

{ #category : #'*SqueakXR-stream extensions' }
TranscriptStream >> endEntry [
	"Display all the characters since the last endEntry, and reset the stream"
	"This method has to be an extension method so it will be included in the XRRemoteService sources"
	self lock critical:
		[(self == Transcript and: [self class redirectToStdOut])
			ifTrue:
				[FileStream stdout nextPutAll: self contents; flush].
			self changed: (self class forceUpdate
				ifTrue: [#appendEntry]
				ifFalse: [#appendEntryLater]).
		 self reset]
]
